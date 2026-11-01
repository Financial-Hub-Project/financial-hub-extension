// Runs on Financial Hub's import page. When the page's upload step for a broker announces it is
// ready, the pending bundle of that broker (if any) is handed to the page, once, as a window
// message of this origin. The page adds it as one more file; the user still picks the target
// portfolio and confirms the preview.

const READY = 'financial-hub:import-ready';

window.addEventListener('message', async (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  if (event.data?.type !== READY || typeof event.data.broker !== 'string') return;
  const pending = await chrome.runtime.sendMessage({ type: 'take-bundle', broker: event.data.broker });
  if (!pending?.bundle) return;
  window.postMessage({ type: pending.bundleMessage, bundle: pending.bundle }, window.location.origin);
});
