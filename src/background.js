// Holds a bundle between the broker page and Financial Hub, in session storage only (cleared when
// the browser closes and as soon as the import page takes it), and opens the import page.

import { brokerById } from './brokers.js';

const DEFAULT_ORIGIN = 'https://financial-hub.es';

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type === 'deliver') {
    // Only the popup (an extension page) hands a bundle over.
    const broker = brokerById(message.broker);
    if (sender.tab || !broker?.supported) return false;
    chrome.storage.session
      .set({ pending: { broker: broker.id, bundle: message.bundle } })
      .then(() => chrome.storage.local.get({ origin: DEFAULT_ORIGIN }))
      .then(({ origin }) =>
        chrome.tabs.create({ url: `${origin}/carteras/importar?broker=${broker.importBroker}` }),
      )
      .then(() => reply({ ok: true }))
      .catch((error) => reply({ ok: false, error: String(error) }));
    return true;
  }
  if (message?.type === 'take-bundle') {
    // Only Financial Hub's content script takes it, for the broker its page asks for, and once.
    const origin = sender.origin ?? (sender.url ? new URL(sender.url).origin : '');
    chrome.storage.local.get({ origin: DEFAULT_ORIGIN }).then(async (settings) => {
      if (origin !== settings.origin) return reply({});
      const { pending } = await chrome.storage.session.get('pending');
      const broker = brokerById(pending?.broker);
      if (!broker || broker.importBroker !== message.broker) return reply({});
      await chrome.storage.session.remove('pending');
      reply({ bundle: pending.bundle, bundleMessage: broker.bundleMessage });
    });
    return true;
  }
  return false;
});
