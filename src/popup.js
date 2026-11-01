// The popup: finds the broker of the active tab, picks the range, asks that tab's adapter for the
// bundle, and either hands it to Financial Hub or saves it locally for testing.

import { brokerForUrl } from './brokers.js';
import { validateBundle } from './validate.js';

const log = document.getElementById('log');
const since = document.getElementById('since');
const confirmation = document.getElementById('confirmation');
const buttons = [document.getElementById('sync'), document.getElementById('download')];

function line(text, kind) {
  const item = document.createElement('li');
  item.textContent = text;
  if (kind) item.className = kind;
  log.append(item);
}

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const broker = brokerForUrl(tab?.url);

if (broker) {
  document.getElementById('title').textContent = `Sincronizar ${broker.name}`;
  document.getElementById('intro').textContent = broker.supported
    ? `Lee tus órdenes y movimientos en esta pestaña de ${broker.name} y los lleva a Financial Hub, donde los revisas antes de importarlos.`
    : `${broker.name} aún no se puede importar en Financial Hub: descarga el paquete para probar el adaptador.`;
  document.getElementById('recent-label').textContent = `Últimos ${broker.recentDays} días`;
  document.getElementById('controls').hidden = false;
  document.getElementById('sync').hidden = !broker.supported;
}

function range() {
  const picked = document.querySelector('input[name=range]:checked').value === 'since';
  if (picked && !since.value) throw new Error('Elige la fecha desde la que leer.');
  return picked ? { from: since.value } : {};
}

for (const input of document.querySelectorAll('input'))
  input.addEventListener('change', () => {
    const picked = document.querySelector('input[name=range]:checked').value === 'since';
    confirmation.hidden = !(
      picked &&
      since.value &&
      Date.now() - Date.parse(`${since.value}T00:00:00Z`) > broker.recentDays * 86_400_000
    );
  });

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'progress') line(message.line);
});

async function collect() {
  line(`Leyendo tu cuenta en ${broker.name}…`);
  const result = await chrome.tabs.sendMessage(tab.id, { type: 'collect', ...range() });
  if (!result?.ok) throw new Error(result?.error ?? 'No se pudo leer la cuenta.');
  // An adapter bug (a wrong shape, a credential in the payload) stops here, before anything leaves.
  const problems = validateBundle(result.bundle);
  if (problems.length) throw new Error(`El paquete no es válido: ${problems.slice(0, 3).join('; ')}`);
  return result.bundle;
}

async function run(action) {
  for (const button of buttons) button.disabled = true;
  log.replaceChildren();
  try {
    await action();
  } catch (error) {
    line(String(error.message ?? error), 'error');
  } finally {
    for (const button of buttons) button.disabled = false;
  }
}

document.getElementById('sync').addEventListener('click', () =>
  run(async () => {
    const bundle = await collect();
    const delivered = await chrome.runtime.sendMessage({ type: 'deliver', broker: broker.id, bundle });
    if (!delivered?.ok) throw new Error(delivered?.error ?? 'No se pudo abrir Financial Hub.');
    line('Abierto Financial Hub: elige la cartera de destino y revisa la vista previa.');
  }),
);

// Saves the bundle on this computer only, to inspect it or check it with
// `npm run validate -- <file>` while developing an adapter. Nothing is sent anywhere.
document.getElementById('download').addEventListener('click', () =>
  run(async () => {
    const bundle = await collect();
    const url = URL.createObjectURL(new Blob([bundle], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${broker.id}-bundle-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    line('Paquete descargado en este ordenador. Contiene tus datos: no lo compartas sin anonimizarlo.', 'warn');
  }),
);
