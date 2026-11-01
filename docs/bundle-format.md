# Bundle formats

A bundle is one UTF-8 JSON document, at most 4 MB, that the popup validates
(`src/validate.js`) before it hands it to Financial Hub or saves it.

## Envelope (every broker)

| Field | Type | Meaning |
| --- | --- | --- |
| `format` | string | `financial-hub/<broker>-api`, registered in `src/brokers.js` |
| `version` | integer | `1`; a breaking change to the fields bumps it |
| `capturedAt` | ISO timestamp | When the adapter read the account |
| `range` | `{ from, to }` (optional) | The dates the adapter asked for, `YYYY-MM-DD` |

Values come from the broker as they are (numbers as JSON numbers or decimal strings, dates as the
broker's ISO timestamps). No key anywhere may be a credential (`token`, `authorization`,
`password`, `cookie`…), and no value may look like a bearer token.

## MyInvestor (`financial-hub/myinvestor-api`, version 1)

Read from `newapp.myinvestor.es` through `api.myinvestor.es` with the page's own session.

```jsonc
{
  "format": "financial-hub/myinvestor-api",
  "version": 1,
  "capturedAt": "2026-11-01T10:00:00.000Z",
  "range": { "from": "2026-08-04", "to": "2026-11-01" },
  "fundOrders": [
    {
      "reference": "…",          // the order reference
      "isin": "LU…",
      "fundName": "…",
      "operationType": "INVESTMENT_FUNDS_SUBSCRIPTION", // or …_REIMBURSEMENT, INTERNAL_/EXTERNAL_TRANSFER_…
      "status": "COMPLETE",      // only complete orders are imported
      "shares": 15.88782,        // full precision
      "market": "FEX",           // FES Spanish funds, FEX foreign funds
      "currency": "EUR",
      "detail": {                // complete orders only
        "relatedOperations": [
          {
            "operationNumber": "…",   // the broker's operation number (9 digits)
            "executionDate": "…",     // NAV day
            "executedShares": 15.8878,
            "netAmountFundCurrency": 2032.37,
            "netAmountEUR": 2032.37
          }
        ]
      }
    }
  ],
  "stockOrders": [
    {
      "id": "…",
      "status": "COMPLETE",
      "operation": "COMPRA RV CONTADO",  // or VENTA RV CONTADO; others are not imported yet
      "marketId": "NYS",                 // NYS, NDQ, XTR, BMA, TOR
      "detail": {                        // complete orders only
        "instrumentIsin": "US…",
        "instrumentName": "…",
        "instrumentCurrency": "USD",
        "executionDate": "…",
        "finishDate": "…",               // settlement day
        "executedShares": 10,
        "netAmountCurrency": 4809.72,    // net of fees, in the instrument currency
        "netAmountEUR": 4122.03          // what the account paid or received
      }
    }
  ],
  "cash": [
    {
      "currency": "EUR",
      "flows": [
        {
          "operationDate": "…",
          "valueDate": "…",
          "operationType": "ABONO DE DIVIDENDO", // the broker's own label
          "concept": "…",                        // the broker's own description
          "amount": 3.79,
          "flowType": "IN",                      // IN or OUT; the sign follows it
          "currency": "EUR",
          "totalBalance": 26.67,                 // running balance after the movement
          "operationRef": "…"                    // carries the operation number of security movements
        }
      ]
    }
  ]
}
```

Notes for MyInvestor:

- Cash movements of the last 90 days come at once; a longer range needs the holder's approval in
  the MyInvestor app (the adapter sends the request and waits for it).
- Fund orders' list amount is an estimate made when ordering; the executed amount is in
  `detail.relatedOperations`.
- Dividends arrive only as cash movements, net of withholding.
