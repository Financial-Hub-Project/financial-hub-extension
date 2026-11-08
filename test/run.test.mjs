import assert from 'node:assert/strict';
import { test } from 'node:test';
import { begin, saved, settle } from '../src/run.js';

// Security and integrity: session storage may only ever hold a validated bundle, and only the
// result of the read in progress, from its own tab, may be delivered or kept.
const valid = JSON.stringify({
  format: 'financial-hub/myinvestor-api',
  version: 1,
  capturedAt: '2026-11-07T10:00:00.000Z',
  range: { from: '2019-05-02', to: '2026-11-07' },
  fundOrders: [],
  stockOrders: [],
  cash: [],
});
const leaking = JSON.stringify({ ...JSON.parse(valid), cash: [{ currency: 'EUR', flows: [], token: 'x' }] });

test('a read result is kept only for its own run and only as a validated bundle', () => {
  const request = { id: 'run-1', broker: 'myinvestor', tabId: 7, purpose: 'download', mode: 'new', range: {} };
  const { run } = begin(null, request, 1);
  assert.equal(begin(run, { ...request, id: 'run-2' }, 2).busy, true);
  assert.equal(settle(run, { runId: 'run-0', ok: true, bundle: valid }, 7, 3), null);
  assert.equal(settle(run, { runId: 'run-1', ok: true, bundle: valid }, 8, 3), null);

  const rejected = settle(run, { runId: 'run-1', ok: true, bundle: leaking }, 7, 3);
  assert.equal(rejected.run.status, 'failed');
  assert.match(rejected.run.error, /token is a forbidden key/);
  assert.equal('bundle' in rejected.run, false);
  assert.equal(rejected.deliver, undefined);

  const ready = settle(run, { runId: 'run-1', ok: true, bundle: valid }, 7, 3).run;
  assert.equal(ready.status, 'ready');
  assert.equal(ready.bundle, valid);
  assert.equal(saved(ready, 'run-0', 4), null);
  assert.equal('bundle' in saved(ready, 'run-1', 4), false);
  assert.equal(begin(ready, { ...request, id: 'run-2' }, 5).run.status, 'running');

  const sync = settle(begin(null, { ...request, purpose: 'sync' }, 1).run, { runId: 'run-1', ok: true, bundle: valid }, 7, 3);
  assert.equal(sync.deliver, valid);
  assert.equal('bundle' in sync.run, false);
});
