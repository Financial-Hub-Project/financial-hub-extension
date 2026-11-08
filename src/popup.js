// The popup: picks the mode and the dates, asks the service worker to start a read in the
// broker's tab and shows how it goes. The read does not depend on this window: it can close at any
// moment (to approve a signature on the phone, say) and, reopened, shows the progress, the error
// or the bundle waiting to be saved, all kept by the service worker (background.js). Its
// contribution tools record an unknown broker's API and copy a failure report, both without the
// user's values.

import { BROKERS, brokerForUrl } from './brokers.js';
import { readRecording, startRecording } from './explorer.js';
import { gapAfter, rangeFor, showDay, todayOf } from './modes.js';
import { apiMap, failureReport } from './report.js';
import { signaturePrompt } from './run.js';

const $ = (id) => document.getElementById(id);
const startButtons = [$('sync'), $('download')];
const today = todayOf();
const TITLES = {
  running: 'Lectura en curso',
  delivered: 'Entregado a Financial Hub',
  ready: 'Paquete listo',
  saved: 'Paquete descargado',
  failed: 'La lectura falló',
};

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const broker = brokerForUrl(tab?.url);
const web = /^https?:/.test(tab?.url ?? '');
/** The read on screen: this tab's broker's, or else the latest of any broker. */
let shown = null;
/** The `to` day of this broker's last delivery to Financial Hub from this browser. */
let lastTo = null;

function line(list, text, kind) {
  const item = document.createElement('li');
  item.textContent = text;
  if (kind) item.className = kind;
  list.append(item);
}

function notice(text, kind = 'error') {
  $('notice').textContent = text ?? '';
  $('notice').className = kind;
  $('notice').hidden = !text;
}

function save(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

const selected = (name) => document.querySelector(`input[name=${name}]:checked`).value;

/** The mode and the dates picked, or an `error` to show. */
function picked() {
  const mode = selected('mode');
  const from = mode === 'new' ? $('opened').value : selected('range') === 'since' ? $('since').value : '';
  return { mode, ...rangeFor({ mode, from, today, recentDays: broker.recentDays }) };
}

/** Shows the options of the mode, the gap warning and whether the broker will ask for a signature. */
function refresh() {
  const { recentDays, name } = broker;
  const mode = selected('mode');
  const recent = selected('range') === 'recent';
  $('update-options').hidden = mode !== 'update';
  $('new-options').hidden = mode !== 'new';
  const range = picked();
  let gap = mode === 'update' && range.from ? gapAfter({ lastTo, from: range.from }) : null;
  if (gap?.unknown && !recent) gap = null; // a start the user picked needs no guess
  $('gap').hidden = !gap;
  $('gap-fix').hidden = !gap?.from;
  if (gap?.from) {
    const start = recent ? `los últimos ${recentDays} días` : `desde el ${showDay(range.from)}`;
    $('gap-text').textContent = `Tu última entrega a Financial Hub desde este navegador llega hasta el ${showDay(gap.from)}: leyendo ${start} quedaría un hueco.`;
    $('gap-fix').textContent = `Leer desde el ${showDay(gap.from)}`;
  } else if (gap?.unknown)
    $('gap-text').textContent = `Este navegador aún no ha entregado esta cuenta a Financial Hub. Si tu cartera no tiene movimientos de los últimos ${recentDays} días, puede quedar un hueco: elige «Desde» el día de su último movimiento.`;
  $('confirmation').hidden = !(range.signature || (mode === 'new' && !range.from));
  $('confirmation').textContent = `Para leer más de ${recentDays} días, ${name} te pedirá aprobar una firma (norma europea PSD2) en la app de tu móvil. Puedes cerrar esta ventana mientras tanto: la lectura sigue en la pestaña de ${name}.`;
}

function render(run) {
  shown = run;
  const running = run?.status === 'running';
  for (const button of startButtons) button.disabled = running;
  $('run').hidden = !run;
  const name = BROKERS.find((item) => item.id === run?.broker)?.name ?? run?.broker;
  // A pending signature goes first, above everything: the read waits for the user's phone.
  const prompt = signaturePrompt(run, name);
  $('signature').hidden = !prompt;
  $('signature-title').textContent = prompt?.title ?? '';
  $('signature-text').textContent = prompt?.text ?? '';
  if (!run) return;
  const at = new Date(run.startedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  $('run-title').textContent = `${TITLES[run.status] ?? run.status} · ${name} · ${at}`;
  $('log').replaceChildren();
  for (const text of run.lines) line($('log'), text);
  if (running) line($('log'), `Puedes cerrar esta ventana: la lectura sigue en la pestaña de ${name} (no la cierres).`, 'hint');
  if (run.status === 'failed') line($('log'), run.error, 'error');
  $('save').hidden = run.status !== 'ready';
  $('report').hidden = run.status !== 'failed' || !run.report;
}

/** Saves a finished download on this computer only; the service worker then drops it. */
async function saveBundle(run) {
  save(`${run.broker}-bundle-${today}.json`, run.bundle);
  await chrome.runtime.sendMessage({ type: 'saved', broker: run.broker, runId: run.id });
}

async function start(purpose) {
  notice(null);
  const range = picked();
  if (range.error) return notice(range.error);
  for (const button of startButtons) button.disabled = true;
  const answer = await chrome.runtime
    .sendMessage({ type: 'start', broker: broker.id, tabId: tab.id, purpose, mode: range.mode, from: range.from, to: range.to })
    .catch((error) => ({ ok: false, error: String(error.message ?? error) }));
  if (answer?.busy) notice('Ya hay una lectura en curso: espera a que termine.', 'warn');
  else if (!answer?.ok) notice(answer?.error ?? 'No se pudo empezar la lectura.');
  render(answer?.run ?? shown);
}

if (broker) {
  $('title').textContent = `Sincronizar ${broker.name}`;
  $('intro').textContent = broker.supported
    ? `Lee tus órdenes y movimientos en esta pestaña de ${broker.name} y los lleva a Financial Hub, donde los revisas antes de importarlos.`
    : `${broker.name} aún no se puede importar en Financial Hub: descarga el paquete para probar el adaptador.`;
  $('recent-label').textContent = `Últimos ${broker.recentDays} días (sin firma)`;
  for (const id of ['since', 'opened']) $(id).max = today;
  $('controls').hidden = false;
  $('sync').hidden = !broker.supported;
  lastTo = (await chrome.storage.local.get(`lastTo:${broker.id}`))[`lastTo:${broker.id}`] ?? null;
  for (const input of document.querySelectorAll('#controls input'))
    for (const type of ['input', 'change']) input.addEventListener(type, refresh);
  $('gap-fix').addEventListener('click', () => {
    document.querySelector('input[name=range][value=since]').checked = true;
    $('since').value = lastTo ?? '';
    refresh();
  });
  $('sync').addEventListener('click', () => start('sync'));
  // "Descargar el paquete" saves the bundle on this computer only, to inspect it or check it with
  // `npm run validate -- <file>` while developing an adapter. Nothing is sent anywhere.
  $('download').addEventListener('click', () => start('download'));
  refresh();
  // A tab opened before the extension was installed or reloaded has no adapter yet.
  const reachable = await chrome.tabs.sendMessage(tab.id, { type: 'collect-status' }).then(() => true, () => false);
  if (!reachable)
    notice(`Recarga la pestaña de ${broker.name}: la extensión se instaló o se actualizó después de abrirla.`, 'warn');
} else if (web) {
  $('intro').textContent =
    'Este bróker aún no está soportado. Puedes ayudar a añadirlo: explora su web y adjunta el mapa a una issue.';
}

const status = (id) =>
  chrome.runtime.sendMessage({ type: 'status', broker: id }).then((answer) => answer?.run ?? null, () => null);
const runs = await Promise.all((broker ? [broker] : BROKERS).map((item) => status(item.id)));
render(runs.filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session') return;
  for (const [key, { oldValue, newValue }] of Object.entries(changes)) {
    if (!key.startsWith('run:') || !newValue || (broker && newValue.broker !== broker.id)) continue;
    render(newValue);
    // A download that finishes while this window is open is saved at once.
    if (newValue.status === 'ready' && oldValue?.status === 'running' && oldValue.id === newValue.id) saveBundle(newValue);
  }
});

$('save').addEventListener('click', () => shown?.status === 'ready' && saveBundle(shown));

// The failure report carries no values (see report.js): it can go into a public issue.
$('report').addEventListener('click', async () => {
  if (!shown?.report) return;
  await navigator.clipboard.writeText(JSON.stringify(shown.report, null, 2));
  notice('Informe copiado. Pégalo en una issue de tipo «Fallo»: no contiene tus datos.', 'ok');
});

// "Explorar": the contribution tools, which run in this window only.
$('explore').hidden = !web;
let exploreFailure = null;

async function explore(action) {
  const log = $('explore-log');
  const buttons = [$('record'), $('map')];
  for (const button of buttons) button.disabled = true;
  log.replaceChildren();
  exploreFailure = null;
  $('explore-report').hidden = true;
  try {
    await action((text) => line(log, text));
  } catch (error) {
    line(log, String(error.message ?? error), 'error');
    exploreFailure = { broker: broker?.id ?? null, step: 'explore', error: error.message };
    $('explore-report').hidden = false;
  } finally {
    for (const button of buttons) button.disabled = false;
  }
}

$('explore-report').addEventListener('click', async () => {
  if (!exploreFailure) return;
  await navigator.clipboard.writeText(JSON.stringify(failureReport(exploreFailure), null, 2));
  line($('explore-log'), 'Informe copiado. Pégalo en una issue de tipo «Fallo»: no contiene tus datos.');
});

$('record').addEventListener('click', () =>
  explore(async (log) => {
    const [done] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: startRecording,
    });
    log(
      done.result
        ? `Ya se estaba explorando (${done.result} llamadas).`
        : 'Explorando. Recorre sin recargar la página tus órdenes, movimientos y posiciones, y vuelve aquí.',
    );
  }),
);

$('map').addEventListener('click', () =>
  explore(async (log) => {
    const [read] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: readRecording,
    });
    if (!read.result) throw new Error('Primero pulsa «Empezar a explorar» en esta pestaña.');
    if (!read.result.length) throw new Error('Aún no se ha grabado ninguna llamada: navega por la web.');
    const host = new URL(tab.url).host;
    const map = apiMap({ host, records: read.result });
    save(`mapa-api-${host}-${todayOf()}.json`, JSON.stringify(map, null, 2));
    log(`Mapa descargado: ${map.endpoints.length} rutas. No contiene tus datos; adjúntalo a una issue «Nuevo bróker».`);
  }),
);
