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

  // Path segments, object keys and query names are kept only when they read like the API's own
  // vocabulary (`orders`, `v2`, `settlementDate`); anything else (ids, ISINs, uuids, e-mails,
  // long tokens) becomes a placeholder, because a web app may put a user's value there. A value
  // written as a plain word (a name, say) cannot be told apart from vocabulary and stays, which is
  // why the user reviews the map before attaching it anywhere.
  const WORD = /^[A-Za-z_$][\w$-]{0,39}$/;
  const plain = (part) => {
    let text = part;
    try {
      text = decodeURIComponent(part);
    } catch {
      // A malformed escape is judged as written.
    }
    return WORD.test(text) && !/\d{3}/.test(text) && !/@/.test(text) && !/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(text);
  };
  const segment = (part) => (part === '' || (part.length <= 24 && plain(part)) ? part : '{id}');
  const key = (name) => (plain(name) ? name : '{key}');
  const shape = (value, depth = 0) => {
    if (depth > 8) return '…';
    if (value === null) return 'null';
    if (Array.isArray(value)) {
      const merged = {};
      let objects = false;
      for (const item of value.slice(0, 50))
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          objects = true;
          for (const [name, child] of Object.entries(item)) merged[key(name)] ??= shape(child, depth + 1);
        }
      return value.length ? [objects ? merged : shape(value[0], depth + 1)] : [];
    }
    if (typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([name, child]) => [key(name), shape(child, depth + 1)]));
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
      query: [...new Set([...parsed.searchParams.keys()].map(key))],
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
