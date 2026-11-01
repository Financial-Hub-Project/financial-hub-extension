import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brokerForUrl } from '../src/brokers.js';
import { validateBundle } from '../src/validate.js';

// A synthetic MyInvestor bundle in the exact shape the adapter builds (docs/bundle-format.md).
const bundle = () => ({
  format: 'financial-hub/myinvestor-api',
  version: 1,
  capturedAt: '2026-11-01T10:00:00.000Z',
  range: { from: '2026-08-04', to: '2026-11-01' },
  fundOrders: [
    {
      reference: '202609030000001',
      isin: 'LU0000000001',
      fundName: 'EXAMPLE FUND A ACC EUR',
      operationType: 'INVESTMENT_FUNDS_SUBSCRIPTION',
      status: 'COMPLETE',
      shares: 15.88782,
      market: 'FEX',
      currency: 'EUR',
      detail: {
        relatedOperations: [
          {
            operationNumber: '100000001',
            executionDate: '2026-09-04T23:59:59.000Z',
            executedShares: 15.8878,
            netAmountFundCurrency: 2032.37,
            netAmountEUR: 2032.37,
          },
        ],
      },
    },
  ],
  stockOrders: [{ id: '100000000000001', status: 'CANCEL', operation: 'COMPRA RV CONTADO', marketId: 'NYS', detail: null }],
  cash: [
    {
      currency: 'EUR',
      flows: [
        {
          operationDate: '2026-10-11T00:00:00.000Z',
          valueDate: '2026-10-10T00:00:00.000Z',
          operationType: 'LIQUIDAC. INTERESES',
          concept: 'PERIODO 10/09/2026 10/10/2026',
          amount: 0.01,
          flowType: 'IN',
          currency: 'EUR',
          totalBalance: 26.68,
          operationRef: '',
        },
      ],
    },
  ],
});

test('a well-formed MyInvestor bundle can be sent', () => {
  assert.deepEqual(validateBundle(JSON.stringify(bundle())), []);
});

test('a bundle carrying a credential never leaves the popup', () => {
  const withKey = bundle();
  withKey.cash[0].flows[0].accessToken = 'abc';
  assert.match(validateBundle(JSON.stringify(withKey)).join(), /accessToken is a forbidden key/);
  const withValue = bundle();
  withValue.cash[0].flows[0].concept = 'Bearer abcdefghijkl';
  assert.match(validateBundle(JSON.stringify(withValue)).join(), /looks like a credential/);
  const withJwt = bundle();
  withJwt.fundOrders[0].reference = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig';
  assert.match(validateBundle(JSON.stringify(withJwt)).join(), /looks like a credential/);
});

test('an adapter bug in the shape is reported before sending', () => {
  const noExecution = bundle();
  noExecution.fundOrders[0].detail = null;
  assert.match(validateBundle(JSON.stringify(noExecution)).join(), /no detail.relatedOperations/);
  const badFlow = bundle();
  badFlow.cash[0].flows[0].flowType = 'CREDIT';
  assert.match(validateBundle(JSON.stringify(badFlow)).join(), /flowType must be IN or OUT/);
  assert.match(validateBundle(JSON.stringify({ ...bundle(), format: 'x' })).join(), /unknown format/);
  assert.match(validateBundle(JSON.stringify({ ...bundle(), version: 2 })).join(), /version must be 1/);
  assert.deepEqual(validateBundle('{'), ['bundle is not valid JSON']);
});

test('the popup finds the broker of the active tab', () => {
  assert.equal(brokerForUrl('https://newapp.myinvestor.es/app/products')?.id, 'myinvestor');
  assert.equal(brokerForUrl('https://example.com/'), null);
  assert.equal(brokerForUrl(undefined), null);
});
