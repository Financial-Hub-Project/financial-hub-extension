import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readRecording, startRecording } from '../src/explorer.js';

test('an exploration map keeps the shape of the calls and drops values hidden in paths, keys and query names', async () => {
  const body = { 'ana.perez@example.net': { balance: 10 }, items: [{ isin: 'ES0000000001', date: '2026-01-02' }] };
  globalThis.window = globalThis;
  globalThis.location = { href: 'https://broker.test/app' };
  globalThis.XMLHttpRequest = class {};
  globalThis.fetch = async () => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  startRecording();
  await window.fetch('https://api.broker.test/v2/users/ana.perez%40example.net/accounts/12345/orders?ana@example.net=1&from=x');
  const [record] = readRecording();
  const text = JSON.stringify(record);
  assert.equal(record.path, 'https://api.broker.test/v2/users/{id}/accounts/{id}/orders');
  assert.deepEqual(record.query, ['{key}', 'from']);
  assert.deepEqual(record.response, { '{key}': { balance: 'number' }, items: [{ isin: 'string', date: 'date' }] });
  assert.ok(!text.includes('perez') && !text.includes('example') && !text.includes('12345'));
});
