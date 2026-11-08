// The service worker. It starts a read in the broker's tab, keeps its progress and result in
// session storage (the popup only shows them, so it can close at any moment), validates the
// bundle the adapter sends back and hands it to Financial Hub's import page. Every step is a
// short message handler: nothing waits here for minutes, and a new message wakes the worker up
// even if Chrome had stopped it.
//
// Session storage (cleared when the browser closes) holds only each broker's read state with its
// messages and a validated bundle until Financial Hub or the popup takes it. Local storage holds
// only the `to` day of each broker's last delivery, never account data.

import { brokerById, brokerForUrl } from './brokers.js';
import { importUrl } from './modes.js';
import { failureReport } from './report.js';
import { begin, failed, progressed, saved, settle, signaturePrompt } from './run.js';

const DEFAULT_ORIGIN = 'https://financial-hub.es';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const runKey = (broker) => `run:${broker}`;
const lastToKey = (broker) => `lastTo:${broker}`;

/** Messages are handled one at a time, so two of them never update the same read at once. */
let queue = Promise.resolve();
function serial(task) {
  const next = queue.then(task);
  queue = next.catch(() => {});
  return next;
}

const readRun = async (broker) => (await chrome.storage.session.get(runKey(broker)))[runKey(broker)] ?? null;

/** Saves a read and, when it starts or stops waiting for a signature, tells the user: the broker
 * itself does not always notify the phone, and the popup may be closed. */
async function writeRun(run) {
  const before = await readRun(run.broker);
  await chrome.storage.session.set({ [runKey(run.broker)]: run });
  const name = brokerById(run.broker)?.name ?? run.broker;
  const prompt = signaturePrompt(run, name);
  if (Boolean(prompt) === Boolean(signaturePrompt(before, name))) return;
  await announceSignature(run.broker, prompt).catch(() => {});
}

const signatureNotice = (broker) => `signature:${broker}`;

/** The badge and the system notification of a pending signature, or their removal (null). */
async function announceSignature(broker, prompt) {
  await chrome.action.setBadgeText({ text: prompt ? 'FIRMA' : '' });
  if (!prompt) return chrome.notifications.clear(signatureNotice(broker));
  await chrome.action.setBadgeBackgroundColor({ color: '#b45309' });
  await chrome.notifications.create(signatureNotice(broker), {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('src/icons/icon-128.png'),
    title: prompt.title,
    message: prompt.text,
    priority: 2,
    requireInteraction: true,
  });
}

/** A failed read with its failure report, which carries no values (report.js): the invalid
 * bundle, if any, is only described there and never stored. */
const fail = (run, error, bundle) => {
  const next = failed(run, error, Date.now());
  return { ...next, report: failureReport({ broker: run.broker, step: run.purpose, error: next.error, bundle }) };
};

/** Whether the read is still going on in its tab (closing or reloading the tab ends it). A tab
 * that does not answer in time (frozen in the background) is left to its read, so the queue of
 * messages never waits on it. */
const PING_MS = 2000;
function alive(run) {
  const ping = chrome.tabs
    .sendMessage(run.tabId, { type: 'collect-status' })
    .then((answer) => answer?.runId === run.id, () => false);
  return Promise.race([ping, new Promise((resolve) => setTimeout(resolve, PING_MS, true))]);
}

/** The broker's last read, marked failed if it ended without sending its result. */
async function current(broker) {
  const run = await readRun(broker);
  if (run?.status !== 'running' || (await alive(run))) return run;
  const ended = fail(run, 'La lectura se interrumpió porque se cerró o recargó la pestaña del bróker. Vuelve a intentarlo.');
  await writeRun(ended);
  return ended;
}

/** The broker whose adapter sent a message from a tab. */
const tabBroker = (sender) => (sender.tab ? brokerForUrl(sender.url) : null);

const handlers = {
  /** From the popup: starts a read in the broker's tab, unless one is already going on. */
  async start(message, sender) {
    const broker = brokerById(message.broker);
    if (sender.tab || !broker || !Number.isInteger(message.tabId)) return { ok: false };
    if (!DAY.test(message.from ?? '') || !DAY.test(message.to ?? '')) return { ok: false, error: 'Fechas no válidas.' };
    const purpose = message.purpose === 'sync' ? 'sync' : 'download';
    if (purpose === 'sync' && !broker.supported)
      return { ok: false, error: `${broker.name} aún no se puede importar en Financial Hub.` };
    const mode = message.mode === 'new' ? 'new' : 'update';
    const request = { id: crypto.randomUUID(), broker: broker.id, tabId: message.tabId, purpose, mode };
    const started = begin(await current(broker.id), { ...request, range: { from: message.from, to: message.to } }, Date.now());
    if (started.busy) return { ok: false, busy: true, run: started.run };
    let run = started.run;
    await writeRun(run);
    let answer = null;
    try {
      answer = await chrome.tabs.sendMessage(run.tabId, { type: 'collect', runId: run.id, from: message.from, to: message.to });
    } catch {
      // No content script in the tab: the extension was installed or reloaded after it opened.
    }
    if (!answer?.ok) {
      run = fail(
        run,
        answer?.busy
          ? `Ya hay una lectura en curso en esta pestaña de ${broker.name}: espera a que termine o recarga la pestaña.`
          : `Recarga la pestaña de ${broker.name} y vuelve a intentarlo (la extensión se instaló o se actualizó después de abrirla).`,
      );
      await writeRun(run);
    }
    return { ok: true, run };
  },

  /** From the popup: the broker's last read. */
  async status(message, sender) {
    const broker = brokerById(message.broker);
    return !sender.tab && broker ? { run: await current(broker.id) } : {};
  },

  /** From the popup: it saved a downloaded bundle, which is then dropped. */
  async saved(message, sender) {
    const broker = brokerById(message.broker);
    if (sender.tab || !broker) return {};
    const next = saved(await readRun(broker.id), message.runId, Date.now());
    if (next) await writeRun(next);
    return {};
  },

  /** From the adapter: a progress line of the read in progress. */
  async progress(message, sender) {
    const broker = tabBroker(sender);
    const next = broker && progressed(await readRun(broker.id), message, sender.tab.id, Date.now());
    if (next) await writeRun(next);
    return {};
  },

  /** From the adapter: the result of the read, with the bundle as JSON text. */
  async collected(message, sender) {
    const broker = tabBroker(sender);
    const run = broker && (await readRun(broker.id));
    const result = run && settle(run, message, sender.tab.id, Date.now());
    if (!result) return { ok: false };
    if (result.failure) {
      await writeRun(fail(result.run, result.failure.error, result.failure.bundle));
      return { ok: true };
    }
    try {
      if (result.deliver) {
        await chrome.storage.session.set({ pending: { broker: broker.id, bundle: result.deliver, to: run.range.to } });
        const { origin } = await chrome.storage.local.get({ origin: DEFAULT_ORIGIN });
        await chrome.tabs.create({ url: importUrl(origin, broker.importBroker, run.mode) });
      }
      // A download keeps its bundle here until the popup saves it (it may be over the quota).
      await writeRun(result.run);
    } catch (error) {
      if (result.deliver) await chrome.storage.session.remove('pending');
      const step = result.deliver ? 'No se pudo abrir Financial Hub' : 'No se pudo guardar el paquete en el navegador';
      await writeRun(fail(run, `${step}: ${error?.message ?? error}`));
    }
    return { ok: true };
  },

  /** From Financial Hub's import page: the pending bundle of the broker it asks for, once. */
  async 'take-bundle'(message, sender) {
    const origin = sender.origin ?? (sender.url ? new URL(sender.url).origin : '');
    const settings = await chrome.storage.local.get({ origin: DEFAULT_ORIGIN });
    if (!sender.tab || origin !== settings.origin) return {};
    const { pending } = await chrome.storage.session.get('pending');
    const broker = brokerById(pending?.broker);
    if (!broker || broker.importBroker !== message.broker) return {};
    await chrome.storage.session.remove('pending');
    // The import page has the bundle: the next update can tell whether it leaves a gap after it.
    if (DAY.test(pending.to ?? '')) await chrome.storage.local.set({ [lastToKey(broker.id)]: pending.to });
    return { bundle: pending.bundle, bundleMessage: broker.bundleMessage };
  },
};

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const handler = Object.hasOwn(handlers, message?.type ?? '') ? handlers[message.type] : null;
  if (!handler || sender.id !== chrome.runtime.id) return false;
  serial(() => handler(message, sender)).then(reply, (error) => reply({ ok: false, error: String(error?.message ?? error) }));
  return true;
});
