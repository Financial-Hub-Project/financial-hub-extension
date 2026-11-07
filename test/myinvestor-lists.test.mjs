import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../src/brokers/myinvestor/lists.js';

// Data integrity: a long history read in pieces must keep every order exactly once. A gap between
// windows, a duplicate at a boundary or a half-read list would reach the portfolio silently.
const { dateWindows, readWindows, readPages, checkComplete } = globalThis.fhLists;
const shift = (day, days) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const span = (from, to) => (Date.parse(to) - Date.parse(from)) / 86_400_000;

test('a long range is read in consecutive one-year windows and each order is kept once', async () => {
  const windows = dateWindows('2020-03-15', '2026-11-07');
  assert.equal(windows[0][0], '2020-03-15');
  assert.equal(windows.at(-1)[1], '2026-11-07');
  for (const [index, [start, end]] of windows.entries()) {
    assert.ok(start <= end && span(start, end) <= 364, `window ${start}..${end} is longer than a year`);
    if (index) assert.equal(start, shift(windows[index - 1][1], 1), `gap or overlap before ${start}`);
  }
  assert.deepEqual(dateWindows('2026-08-10', '2026-11-07'), [['2026-08-10', '2026-11-07']]);

  // An invented account: one order every 30 days; the API also returns the month before each
  // window (as if it filtered by another date), so every boundary repeats an order.
  const orders = Array.from({ length: 30 }, (_, month) => ({
    reference: `R-${month}`,
    date: shift('2024-01-10', month * 30),
  }));
  const read = async (start, end) => orders.filter((order) => order.date >= shift(start, -31) && order.date <= end);
  const kept = await readWindows({ from: '2024-01-01', to: '2026-05-01', key: (order) => order.reference, read });
  assert.deepEqual(
    kept.map((order) => order.reference).sort(),
    orders.filter((order) => order.date <= '2026-05-01').map((order) => order.reference).sort(),
  );
});

test('pages are followed only when the response confirms them, otherwise the read fails', async () => {
  const pages = [['a', 'b'], ['c', 'd'], ['e']];
  const paged = (confirms) => async (page) => {
    const index = page && confirms ? page.value : 0;
    return { payload: { data: pages[index], pagination: { page: index, totalPages: pages.length } } };
  };
  assert.deepEqual(await readPages(async () => ({ payload: { data: ['a', 'b'] } })), ['a', 'b']);
  assert.deepEqual(await readPages(async () => ({ payload: { data: null } })), []);
  assert.deepEqual(await readPages(paged(true)), ['a', 'b', 'c', 'd', 'e']);
  await assert.rejects(readPages(paged(false)), /no devolvió la página 1/);
  await assert.rejects(readPages(async () => ({ payload: { data: ['a'], hasNext: true } })), /hasNext/);
  await assert.rejects(readPages(async () => ({ payload: { data: { content: [] } } })), /content/);
  assert.throws(() => checkComplete({ payload: { data: { flowList: [{}], totalElements: 2 } } }, 1), /totalElements/);
  assert.doesNotThrow(() => checkComplete({ payload: { data: { flowList: [{}] } } }, 1));
});
