import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bundleReport, shapeOf } from '../src/report.js';

// Privacy: a report goes into a public issue, so it must keep the structure, counts and the
// broker's fixed labels, and drop every value of the user's.
const bundle = {
  format: 'financial-hub/myinvestor-api',
  version: 1,
  capturedAt: '2026-11-01T10:00:00.000Z',
  fundOrders: [
    {
      reference: '202609030000001',
      isin: 'LU0000000001',
      fundName: 'SECRET FUND NAME',
      operationType: 'INVESTMENT_FUNDS_SUBSCRIPTION',
      status: 'COMPLETE',
      shares: 15.88782,
      market: 'FEX',
      currency: 'EUR',
      detail: {
        relatedOperations: [
          {
            operationNumber: '123456789',
            executionDate: '2026-09-04T23:59:59.000Z',
            executedShares: 15.8878,
            netAmountFundCurrency: 2032.37,
            netAmountEUR: 2032.37,
          },
        ],
      },
    },
  ],
  stockOrders: [],
  cash: [
    {
      currency: 'EUR',
      flows: [
        {
          operationDate: '2026-10-11T00:00:00.000Z',
          valueDate: '2026-10-10T00:00:00.000Z',
          operationType: 'TRANSFERENCIA SEPA',
          concept: 'PAYMENT TO JOHN DOE',
          amount: 777.77,
          flowType: 'IN',
          currency: 'EUR',
          totalBalance: 9999.99,
          operationRef: 'REF-SECRET-42',
        },
      ],
    },
  ],
};

test('a bundle report keeps counts, structure and labels but none of the values', () => {
  const report = bundleReport(JSON.stringify(bundle));
  assert.deepEqual(report.counts, { fundOrders: 1, stockOrders: 0, cash: 1 });
  assert.deepEqual(report.problems, []);
  assert.equal(report.labels.operationType['TRANSFERENCIA SEPA'], 1);
  assert.equal(report.labels.market.FEX, 1);
  assert.equal(report.shape.cash[0].flows[0].amount, 'number');
  assert.equal(report.shape.cash[0].flows[0].operationDate, 'date');
  const text = JSON.stringify(report);
  for (const secret of [
    'LU0000000001', 'SECRET FUND NAME', '202609030000001', '123456789', '15.88782', '2032.37',
    'JOHN DOE', '777.77', '9999.99', 'REF-SECRET-42', '2026-10-11', '2026-09-04',
  ])
    assert.equal(text.includes(secret), false, `report leaks ${secret}`);
});

test('shapes describe types, never values', () => {
  assert.deepEqual(shapeOf({ a: 'x', b: 1, c: [{ d: '2026-01-01' }], e: null }), {
    a: 'string',
    b: 'number',
    c: [{ d: 'date' }],
    e: 'null',
  });
});
