// Long lists from MyInvestor's API, read in pieces: consecutive date windows and, when a response
// says there are more, its pages. A classic script (no imports or exports) loaded before
// content.js in the same isolated world; the tests import it too. Nothing here sees the token.

globalThis.fhLists = (() => {
  const DAY_MS = 86_400_000;
  /** Orders are asked for one year at a time instead of one range of several years. */
  const WINDOW_DAYS = 365;
  const MAX_PAGES = 50;
  const NESTED = ['pagination', 'paging', 'pageable', 'page', 'meta'];
  const SIGNALS = {
    page: { keys: ['page', 'pageNumber', 'currentPage'], type: 'number' },
    pages: { keys: ['totalPages', 'pageCount'], type: 'number' },
    total: { keys: ['totalElements', 'totalCount', 'totalItems', 'totalRecords', 'totalResults'], type: 'number' },
    more: { keys: ['hasNext', 'hasMore', 'hasNextPage'], type: 'boolean' },
    last: { keys: ['last', 'isLast', 'lastPage'], type: 'boolean' },
  };

  const shift = (day, days) =>
    new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

  /** Consecutive [from, to] windows of at most `days` days that cover the range without overlap. */
  function dateWindows(from, to, days = WINDOW_DAYS) {
    if (!(from <= to)) throw new Error(`El rango de fechas no es válido (${from} a ${to}).`);
    const windows = [];
    for (let start = from; start <= to; start = shift(start, days)) {
      const end = shift(start, days - 1);
      windows.push([start, end < to ? end : to]);
    }
    return windows;
  }

  /** The items in order, each key once (the first seen); items without a key are all kept. */
  function uniqueBy(items, key) {
    const seen = new Set();
    return items.filter((item) => {
      const id = key(item);
      if (id === undefined || id === null || id === '') return true;
      if (seen.has(String(id))) return false;
      seen.add(String(id));
      return true;
    });
  }

  /** A list read window by window over [from, to], each item once by `key`. */
  async function readWindows({ from, to, read, key, days }) {
    const all = [];
    for (const [start, end] of dateWindows(from, to, days)) all.push(...(await read(start, end)));
    return uniqueBy(all, key);
  }

  /** The list of a response: MyInvestor wraps it in `payload.data`. */
  function listOf(body) {
    const data = body && body.payload ? body.payload.data : body;
    if (data === null || data === undefined) return [];
    if (!Array.isArray(data))
      throw new Error(`MyInvestor devolvió una lista con otra forma (${Object.keys(data).join(', ')}).`);
    return data;
  }

  /** The paging fields of a response (the body, its payload and its data, and their paging
   * objects), with the names of the ones found: only names ever reach an error or a report. */
  function paging(body) {
    const places = [];
    for (const level of [body, body?.payload, body?.payload?.data])
      if (isObject(level)) {
        places.push(level);
        for (const key of NESTED) if (isObject(level[key])) places.push(level[key]);
      }
    const found = { signals: [] };
    for (const [name, { keys, type }] of Object.entries(SIGNALS))
      search: for (const place of places)
        for (const key of keys)
          if (typeof place[key] === type) {
            found[name] = place[key];
            found.signals.push(key);
            if (name === 'page') found.pageKey = key;
            break search;
          }
    return found;
  }

  /** Whether a response says more items follow after `read` of them (first page index `base`). */
  function hasMore(info, read, base) {
    if (typeof info.more === 'boolean') return info.more;
    if (typeof info.last === 'boolean') return !info.last;
    if (typeof info.total === 'number') return read < info.total;
    if (typeof info.pages === 'number' && typeof info.page === 'number') return info.page - base + 1 < info.pages;
    return false;
  }

  /**
   * Every item of a list endpoint. `read(page)` fetches one response body: `page` is null for the
   * first request, then `{ key, value }` for the query parameter of the next page. A page is
   * followed only when the response names its page and confirms the one asked for; any other
   * "there is more" fails the read, so a list is never returned half-read.
   */
  async function readPages(read) {
    let body = await read(null);
    const all = [...listOf(body)];
    let info = paging(body);
    const base = info.page ?? 0;
    for (let count = 1; hasMore(info, all.length, base); count++) {
      if (typeof info.page !== 'number' || count >= MAX_PAGES)
        throw new Error(
          `MyInvestor devolvió una lista con más páginas que la extensión no sabe pedir (${info.signals.join(', ')}).`,
        );
      const next = info.page + 1;
      body = await read({ key: info.pageKey, value: next });
      const page = listOf(body);
      info = paging(body);
      if (info.page !== next)
        throw new Error(`MyInvestor no devolvió la página ${next} de una lista (${info.signals.join(', ')}).`);
      all.push(...page);
    }
    return all;
  }

  /** Fails when a response read in one request (the signed cash movements) says it has more. */
  function checkComplete(body, count) {
    const info = paging(body);
    if (hasMore(info, count, info.page ?? 0))
      throw new Error(
        `MyInvestor devolvió los movimientos en varias páginas y la extensión aún no las recorre (${info.signals.join(', ')}).`,
      );
  }

  return { dateWindows, uniqueBy, readWindows, readPages, checkComplete };
})();
