import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gapAfter, rangeFor } from '../src/modes.js';

// Data integrity: the range decides which movements reach the portfolio, and the gap warning is
// the only hint, before the server's own check, that "the last 90 days" would leave a hole.
test('each mode reads its range, asks for a signature past the recent days and warns of a gap', () => {
  const day = { today: '2026-11-07', recentDays: 90 };
  assert.deepEqual(rangeFor({ ...day, mode: 'update' }), { from: '2026-08-10', to: '2026-11-07', signature: false });
  assert.equal(rangeFor({ ...day, mode: 'update', from: '2026-08-10' }).signature, false);
  assert.equal(rangeFor({ ...day, mode: 'update', from: '2026-08-09' }).signature, true);
  assert.deepEqual(rangeFor({ ...day, mode: 'new', from: '2019-05-02' }), { from: '2019-05-02', to: '2026-11-07', signature: true });
  assert.match(rangeFor({ ...day, mode: 'new' }).error, /apertura/);
  assert.match(rangeFor({ ...day, mode: 'update', from: '2026-11-08' }).error, /posterior/);

  // "The last 90 days" start on 2026-08-10: a last delivery up to that day leaves no gap.
  const recent = rangeFor({ ...day, mode: 'update' }).from;
  assert.deepEqual(gapAfter({ lastTo: null, from: recent }), { unknown: true });
  assert.equal(gapAfter({ lastTo: '2026-08-10', from: recent }), null);
  assert.deepEqual(gapAfter({ lastTo: '2026-08-09', from: recent }), { from: '2026-08-09' });
  assert.equal(gapAfter({ lastTo: '2026-11-07', from: recent }), null);
  assert.deepEqual(gapAfter({ lastTo: '2026-09-01', from: '2026-10-01' }), { from: '2026-09-01' });
});
