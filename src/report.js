// Reports a user can attach to a public issue: what went wrong or what a broker's API looks
// like, without any of the user's values. Only field names, types, counts, HTTP statuses and the
// broker's own fixed labels (an operation type, a currency) ever leave this module.

import { validateBundle } from './validate.js';

/** Keys whose values are the broker's fixed labels, never the user's data. */
const LABEL_KEYS = new Set([
  'format', 'version', 'status', 'operationType', 'operation', 'market', 'marketId', 'flowType',
  'currency', 'instrumentCurrency', 'orderTypeName', 'operationClass',
]);
const MAX_LABELS = 40;

const DATE = /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** The structure of a value: types for leaves, merged keys for objects, one shape per array. */
export function shapeOf(value, depth = 0) {
  if (depth > 8) return '…';
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    if (!value.length) return [];
    const merged = {};
    let objects = false;
    for (const item of value.slice(0, 50)) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        objects = true;
        for (const [key, child] of Object.entries(item))
          merged[key] ??= shapeOf(child, depth + 1);
      }
    }
    return [objects ? merged : shapeOf(value[0], depth + 1)];
  }
  if (typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shapeOf(child, depth + 1)]));
  if (typeof value === 'string') return DATE.test(value) ? 'date' : 'string';
  return typeof value;
}

/** The broker labels found under `LABEL_KEYS`, with how often each appears. */
function labels(value, found = {}) {
  if (Array.isArray(value)) for (const item of value) labels(item, found);
  else if (value && typeof value === 'object')
    for (const [key, child] of Object.entries(value)) {
      if (LABEL_KEYS.has(key) && (typeof child === 'string' || typeof child === 'number')) {
        const label = String(child).slice(0, 60);
        found[key] ??= {};
        if (Object.keys(found[key]).length < MAX_LABELS || label in found[key])
          found[key][label] = (found[key][label] ?? 0) + 1;
      } else labels(child, found);
    }
  return found;
}

/** A bundle described without its values: counts, structure, labels and validation problems. */
export function bundleReport(text) {
  let bundle;
  try {
    bundle = JSON.parse(text);
  } catch {
    return { parseError: true };
  }
  const counts = {};
  for (const [key, value] of Object.entries(bundle ?? {}))
    if (Array.isArray(value))
      counts[key] = value.reduce(
        (sum, item) => sum + (Array.isArray(item?.flows) ? item.flows.length : 1),
        0,
      );
  return {
    format: bundle?.format,
    version: bundle?.version,
    counts,
    labels: labels(bundle),
    shape: shapeOf(bundle),
    problems: validateBundle(text),
  };
}

/** What a user attaches to a "fallo" issue. */
export function failureReport({ broker, step, error, bundle }) {
  const agent = /Chrome\/(\d+)/.exec(navigator.userAgent)?.[1];
  return {
    kind: 'financial-hub-extension/failure-report',
    version: 1,
    extension: chrome.runtime.getManifest().version,
    chrome: agent ? Number(agent) : null,
    broker,
    step,
    // Error texts are the extension's own messages and HTTP statuses, never page content.
    error: String(error ?? '').slice(0, 300),
    bundle: bundle ? bundleReport(bundle) : null,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

/** What a user attaches to a "nuevo bróker" issue: the recorded calls grouped by endpoint. */
export function apiMap({ host, records }) {
  const endpoints = new Map();
  for (const record of records) {
    const key = `${record.method} ${record.path}`;
    const known = endpoints.get(key) ?? {
      method: record.method,
      path: record.path,
      query: [],
      requestHeaders: [],
      statuses: [],
      requestBody: null,
      response: null,
      calls: 0,
    };
    known.calls += 1;
    for (const name of record.query) if (!known.query.includes(name)) known.query.push(name);
    for (const name of record.requestHeaders)
      if (!known.requestHeaders.includes(name)) known.requestHeaders.push(name);
    if (!known.statuses.includes(record.status)) known.statuses.push(record.status);
    known.requestBody ??= record.requestBody;
    known.response ??= record.response;
    endpoints.set(key, known);
  }
  return {
    kind: 'financial-hub-extension/api-map',
    version: 1,
    extension: chrome.runtime.getManifest().version,
    host,
    endpoints: [...endpoints.values()].sort((a, b) => a.path.localeCompare(b.path)),
    createdAt: new Date().toISOString().slice(0, 10),
  };
}
