// The popup: finds the broker of the active tab, picks the range, asks that tab's adapter for the
// bundle, and either hands it to Financial Hub or saves it locally for testing. Its contribution
// tools record an unknown broker's API and copy a failure report, both without the user's values.

import { brokerForUrl } from './brokers.js';
import { readRecording, startRecording } from './explorer.js';
import { apiMap, failureReport } from './report.js';
import { validateBundle } from './validate.js';

const log = document.getElementById('log');
const since = document.getElementById('since');
const confirmation = document.getElementById('confirmation');
const buttons = [...document.querySelectorAll('button')];
const reportButton = document.getElementById('report');
/** The last failure, kept only in this popup to build its report. */
let failure = null;

function line(text, kind) {
  const item = document.createElement('li');
  item.textContent = text;
  if (kind) item.className = kind;
  log.append(item);
}

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const broker = brokerForUrl(tab?.url);
const web = /^https?:/.test(tab?.url ?? '');

if (broker) {
  document.getElementById('title').textContent = `Sincronizar ${broker.name}`;
  document.getElementById('intro').textContent = broker.supported
    ? `Lee tus órdenes y movimientos en esta pestaña de ${broker.name} y los lleva a Financial Hub, donde los revisas antes de importarlos.`
    : `${broker.name} aún no se puede importar en Financial Hub: descarga el paquete para probar el adaptador.`;
  document.getElementById('recent-label').textContent = `Últimos ${broker.recentDays} días`;
  document.getElementById('controls').hidden = false;
  document.getElementById('sync').hidden = !broker.supported;
} else if (web) {
  document.getElementById('intro').textContent =
    'Este bróker aún no está soportado. Puedes ayudar a añadirlo: explora su web y adjunta el mapa a una issue.';
}
document.getElementById('explore').hidden = !web;

function range() {
  const picked = document.querySelector('input[name=range]:checked').value === 'since';
  if (picked && !since.value) throw new Error('Elige la fecha desde la que leer.');
  return picked ? { from: since.value } : {};
}

for (const input of document.querySelectorAll('input'))
  input.addEventListener('change', () => {
    const picked = document.querySelector('input[name=range]:checked').value === 'since';
    confirmation.hidden = !(
      broker &&
      picked &&
      since.value &&
      Date.now() - Date.parse(`${since.value}T00:00:00Z`) > broker.recentDays * 86_400_000
    );
  });

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'progress') line(message.line);
});

async function collect(step) {
  line(`Leyendo tu cuenta en ${broker.name}…`);
  const result = await chrome.tabs.sendMessage(tab.id, { type: 'collect', ...range() });
  if (!result?.ok) throw Object.assign(new Error(result?.error ?? 'No se pudo leer la cuenta.'), { step });
  // An adapter bug (a wrong shape, a credential in the payload) stops here, before anything leaves.
  const problems = validateBundle(result.bundle);
  if (problems.length)
    throw Object.assign(new Error(`El paquete no es válido: ${problems.slice(0, 3).join('; ')}`), {
      step,
      bundle: result.bundle,
    });
  return result.bundle;
}

async function run(step, action) {
  for (const button of buttons) button.disabled = true;
  log.replaceChildren();
  failure = null;
  reportButton.hidden = true;
  try {
    await action();
  } catch (error) {
    line(String(error.message ?? error), 'error');
    failure = { broker: broker?.id ?? null, step: error.step ?? step, error: error.message, bundle: error.bundle };
    reportButton.hidden = false;
  } finally {
    for (const button of buttons) button.disabled = false;
  }
}

function save(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
const today = () => new Date().toISOString().slice(0, 10);

document.getElementById('sync').addEventListener('click', () =>
  run('sync', async () => {
    const bundle = await collect('sync');
    const delivered = await chrome.runtime.sendMessage({ type: 'deliver', broker: broker.id, bundle });
    if (!delivered?.ok) throw new Error(delivered?.error ?? 'No se pudo abrir Financial Hub.');
    line('Abierto Financial Hub: elige la cartera de destino y revisa la vista previa.');
  }),
);

// Saves the bundle on this computer only, to inspect it or check it with
// `npm run validate -- <file>` while developing an adapter. Nothing is sent anywhere.
document.getElementById('download').addEventListener('click', () =>
  run('download', async () => {
    save(`${broker.id}-bundle-${today()}.json`, await collect('download'));
    line('Paquete descargado en este ordenador. Contiene tus datos: no lo compartas.', 'warn');
  }),
);

// The failure report carries no values (see report.js): it can go into a public issue.
reportButton.addEventListener('click', async () => {
  if (!failure) return;
  await navigator.clipboard.writeText(JSON.stringify(failureReport(failure), null, 2));
  line('Informe copiado. Pégalo en una issue de tipo «Fallo»: no contiene tus datos.');
});

document.getElementById('record').addEventListener('click', () =>
  run('explore', async () => {
    const [done] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: startRecording,
    });
    line(
      done.result
        ? `Ya se estaba explorando (${done.result} llamadas).`
        : 'Explorando. Recorre sin recargar la página tus órdenes, movimientos y posiciones, y vuelve aquí.',
    );
  }),
);

document.getElementById('map').addEventListener('click', () =>
  run('explore', async () => {
    const [read] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: readRecording,
    });
    if (!read.result) throw new Error('Primero pulsa «Empezar a explorar» en esta pestaña.');
    if (!read.result.length) throw new Error('Aún no se ha grabado ninguna llamada: navega por la web.');
    const host = new URL(tab.url).host;
    const map = apiMap({ host, records: read.result });
    save(`mapa-api-${host}-${today()}.json`, JSON.stringify(map, null, 2));
    line(
      `Mapa descargado: ${map.endpoints.length} rutas. No contiene tus datos; adjúntalo a una issue «Nuevo bróker».`,
    );
  }),
);
