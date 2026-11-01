// "Explorar este bróker": records the API calls a broker's web app makes while the user browses
// it, keeping only what an adapter author needs and none of the user's values. Both functions
// are injected into the page's own world by `chrome.scripting.executeScript`, so each must be
// self-contained (no imports, no outer variables).

/** Starts recording in the current page. Idempotent; lasts until the page reloads. */
export function startRecording() {
  if (window.__fhExplorer) return window.__fhExplorer.records.length;
  const MAX_RECORDS = 500;
  const DATE = /^\d{4}-\d{2}-\d{2}(?:[T ][\d:.]+(?:Z|[+-]\d{2}:?\d{2})?)?$/;
  const state = { records: [] };
  window.__fhExplorer = state;

  // Ids, ISINs, uuids and long tokens in a path become placeholders.
  const segment = (part) =>
    /^\d+$/.test(part)
      ? '{id}'
      : /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(part)
        ? '{isin}'
        : /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(part) || part.length > 24
          ? '{id}'
          : part;
  const shape = (value, depth = 0) => {
    if (depth > 8) return '…';
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      const merged = {};
      let objects = false;
      for (const item of value.slice(0, 50))
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          objects = true;
          for (const [key, child] of Object.entries(item)) merged[key] ??= shape(child, depth + 1);
        }
      return value.length ? [objects ? merged : shape(value[0], depth + 1)] : [];
    }
    if (typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v, depth + 1)]));
    if (typeof value === 'string') return DATE.test(value) ? 'date' : 'string';
    return typeof value;
  };
  const parse = (text) => {
    try {
      return text ? shape(JSON.parse(text)) : null;
    } catch {
      return 'not-json';
    }
  };
  const record = (method, url, headers, body, status, text) => {
    if (state.records.length >= MAX_RECORDS) return;
    let parsed;
    try {
      parsed = new URL(url, location.href);
    } catch {
      return;
    }
    state.records.push({
      method: String(method || 'GET').toUpperCase(),
      path: `${parsed.origin}${parsed.pathname.split('/').map(segment).join('/')}`,
      query: [...parsed.searchParams.keys()],
      // Header names only: they tell how the page authenticates, never with what.
      requestHeaders: headers.map((name) => name.toLowerCase()),
      requestBody: typeof body === 'string' ? parse(body) : null,
      status,
      response: parse(text),
    });
  };

  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const response = await originalFetch.apply(this, arguments);
    try {
      const url = typeof input === 'string' ? input : input.url;
      const headers = [...new Headers((init && init.headers) || (input && input.headers) || {}).keys()];
      const type = response.headers.get('content-type') || '';
      const text = type.includes('json') ? await response.clone().text() : '';
      record((init && init.method) || (input && input.method), url, headers, init && init.body, response.status, text);
    } catch {
      // Recording never breaks the page.
    }
    return response;
  };
  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  const setHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__fh = { method, url, headers: [] };
    return open.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (name) {
    this.__fh?.headers.push(name);
    return setHeader.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener('loadend', () => {
      try {
        const type = this.getResponseHeader('content-type') || '';
        const text = type.includes('json') && typeof this.response === 'string' ? this.response : '';
        record(this.__fh?.method, this.__fh?.url, this.__fh?.headers ?? [], body, this.status, text);
      } catch {
        // Recording never breaks the page.
      }
    });
    return send.apply(this, arguments);
  };
  return 0;
}

/** The records so far (already free of values), or null if not recording. */
export function readRecording() {
  return window.__fhExplorer ? window.__fhExplorer.records : null;
}
