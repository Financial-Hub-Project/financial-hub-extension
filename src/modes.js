// The two uses of the extension and the dates each one reads. "update" brings the recent
// movements to a portfolio that already exists; "new" reads the account from its opening for a
// new portfolio. Dates are `YYYY-MM-DD` days, as the brokers' APIs take them.

const DAY_MS = 86_400_000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Today as a `YYYY-MM-DD` day (UTC, the same day the adapters read up to). */
export const todayOf = (now = new Date()) => now.toISOString().slice(0, 10);

export const shiftDay = (day, days) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/**
 * The days to read for a mode, and whether the broker will ask for a signature (more than its
 * `recentDays`, counting today). "update" defaults to the recent days; "new" needs its start.
 */
export function rangeFor({ mode, from, today, recentDays }) {
  if (mode === 'new' && !from) return { error: 'Elige la fecha de apertura de tu cuenta (o una anterior).' };
  const start = from || shiftDay(today, -(recentDays - 1));
  if (!DAY.test(start) || Number.isNaN(Date.parse(start))) return { error: 'La fecha de inicio no es válida.' };
  if (start > today) return { error: 'La fecha de inicio no puede ser posterior a hoy.' };
  return { from: start, to: today, signature: daysBetween(start, today) > recentDays - 1 };
}

/**
 * Whether a read starting on `from` would leave a hole after the last delivery to Financial Hub
 * (`lastTo`, kept by this browser): `{ from }` to read from that day instead, `{ unknown }` when
 * there is no delivery to compare with, or null when it is covered. The server checks for itself.
 */
export function gapAfter({ lastTo, from }) {
  if (typeof lastTo !== 'string' || !DAY.test(lastTo)) return { unknown: true };
  return lastTo < from ? { from: lastTo } : null;
}

/** Financial Hub's import page for a delivered bundle. `modo` is the contract with the web app,
 * which ignores it until it knows it (odd/tasks/myinvestor-extension-modos.md). */
export function importUrl(origin, importBroker, mode) {
  const url = new URL('/carteras/importar', origin);
  url.searchParams.set('broker', importBroker);
  url.searchParams.set('modo', mode === 'new' ? 'nueva' : 'actualizar');
  return url.href;
}

/** A day the way the popup shows it: 07/11/2026. */
export const showDay = (day) => day.split('-').reverse().join('/');
