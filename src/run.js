// The state of one read of a broker account, kept by the service worker in session storage so the
// popup can close and reopen at any moment. Pure transitions; background.js stores them.
//
//   running ──▶ delivered                 (sync: the bundle went to Financial Hub)
//      │   └──▶ ready ──▶ saved          (download: the popup saved the bundle)
//      └──────▶ failed                    (with a failure report without values)
//
// Only a bundle that passed `validateBundle` is ever kept (in `ready`, until the popup saves it).

import { validateBundle } from './validate.js';

const MAX_LINES = 40;
const MAX_TEXT = 300;

/** Starts a read unless one is already running (the caller checks first that it is still alive). */
export function begin(current, { id, broker, tabId, purpose, mode, range }, now) {
  if (current?.status === 'running') return { busy: true, run: current };
  return {
    run: { id, broker, tabId, purpose, mode, range, status: 'running', awaitingSignature: false, lines: [], error: null, report: null, startedAt: now, updatedAt: now },
  };
}

/** Whether a message from a tab belongs to the read in progress. */
const owns = (run, message, tabId) =>
  run?.status === 'running' && typeof message?.runId === 'string' && message.runId === run.id && tabId === run.tabId;

const withLine = (run, line) => [...run.lines, String(line).slice(0, MAX_TEXT)].slice(-MAX_LINES);

/** A progress line of the adapter, or null when it is not for the read in progress. A line with
 * `signature` says the broker waits for the user to approve a signature in its app; any other
 * line means that step is over. */
export function progressed(run, message, tabId, now) {
  if (!owns(run, message, tabId) || typeof message.line !== 'string') return null;
  return { ...run, awaitingSignature: message.signature === true, lines: withLine(run, message.line), updatedAt: now };
}

/** What the popup says while the read waits for the user to approve a
 * signature in the broker's app, or null. The broker does not always notify the phone, so the
 * user has to be told to open the app. The adapter gives up after 5 minutes (content.js). */
export function signaturePrompt(run, name) {
  if (run?.status !== 'running' || run.awaitingSignature !== true) return null;
  return {
    title: `Aprueba la firma en la app de ${name}`,
    text: `Abre la app de ${name} en tu móvil y aprueba la solicitud de firma: ${name} no siempre avisa con una notificación. Tienes 5 minutos; después la lectura se cancela.`,
  };
}

export function failed(run, error, now) {
  const { bundle, ...rest } = run;
  return { ...rest, status: 'failed', awaitingSignature: false, error: String(error).slice(0, MAX_TEXT), updatedAt: now };
}

/**
 * What the adapter's result means for the read in progress, or null when it is not for it:
 * `{ run }` with the next state, `deliver` with the validated bundle for Financial Hub, and
 * `failure` with what the failure report describes (an invalid bundle goes only there).
 */
export function settle(current, message, tabId, now) {
  if (!owns(current, message, tabId)) return null;
  // The result repeats every progress line, in case the last ones arrived after it.
  const lines = Array.isArray(message.lines) ? message.lines.filter((line) => typeof line === 'string') : null;
  const settled = { ...current, awaitingSignature: false };
  const run = lines ? { ...settled, lines: lines.map((line) => line.slice(0, MAX_TEXT)).slice(-MAX_LINES) } : settled;
  if (!message.ok) {
    const error = typeof message.error === 'string' ? message.error : 'No se pudo leer la cuenta.';
    return { run: failed(run, error, now), failure: { error } };
  }
  const problems = typeof message.bundle === 'string' ? validateBundle(message.bundle) : ['bundle must be text'];
  if (problems.length) {
    const error = `El paquete no es válido: ${problems.slice(0, 3).join('; ')}`;
    return { run: failed(run, error, now), failure: { error, bundle: message.bundle } };
  }
  if (run.purpose === 'download') {
    const line = 'Paquete listo para guardar en este ordenador.';
    return { run: { ...run, status: 'ready', bundle: message.bundle, lines: withLine(run, line), updatedAt: now } };
  }
  const line =
    run.mode === 'new'
      ? 'Abierto Financial Hub: crea la cartera nueva y revisa la vista previa.'
      : 'Abierto Financial Hub: elige la cartera que actualizas y revisa la vista previa.';
  return { run: { ...run, status: 'delivered', lines: withLine(run, line), updatedAt: now }, deliver: message.bundle };
}

/** The popup saved the bundle of a finished download: it is no longer kept. */
export function saved(run, runId, now) {
  if (run?.status !== 'ready' || run.id !== runId) return null;
  const { bundle, ...rest } = run;
  const line = 'Paquete descargado en este ordenador. Contiene tus datos: no lo compartas.';
  return { ...rest, status: 'saved', lines: withLine(run, line), updatedAt: now };
}
