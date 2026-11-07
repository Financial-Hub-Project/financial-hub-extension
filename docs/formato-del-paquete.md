# Formatos de paquete

Un paquete es un documento JSON en UTF-8, de 4 MB como máximo, que la extensión valida
(`src/validate.js`, en el service worker) antes de entregarlo a Financial Hub o guardarlo.

## Sobre (todos los brókers)

| Campo | Tipo | Significado |
| --- | --- | --- |
| `format` | cadena | `financial-hub/<broker>-api`, registrado en `src/brokers.js` |
| `version` | entero | `1`; un cambio incompatible en los campos lo incrementa |
| `capturedAt` | fecha y hora ISO | Cuándo leyó el adaptador la cuenta |
| `range` | `{ from, to }` (opcional) | Las fechas que pidió el adaptador, `AAAA-MM-DD` |

Los valores llegan tal como los da el bróker (números como números JSON o cadenas decimales, fechas
como las marcas de tiempo ISO del bróker). Ninguna clave, en ningún nivel, puede ser una credencial
(`token`, `authorization`, `password`, `cookie`…), y ningún valor puede parecer un token.

## MyInvestor (`financial-hub/myinvestor-api`, version 1)

Se lee desde `newapp.myinvestor.es` a través de `api.myinvestor.es` con la sesión de la propia página.

```jsonc
{
  "format": "financial-hub/myinvestor-api",
  "version": 1,
  "capturedAt": "2026-11-01T10:00:00.000Z",
  "range": { "from": "2026-08-04", "to": "2026-11-01" },
  "fundOrders": [
    {
      "reference": "…",          // la referencia de la orden
      "isin": "LU…",
      "fundName": "…",
      "operationType": "INVESTMENT_FUNDS_SUBSCRIPTION", // o …_REIMBURSEMENT, INTERNAL_/EXTERNAL_TRANSFER_…
      "status": "COMPLETE",      // solo se importan las órdenes completadas
      "shares": 15.88782,        // precisión completa
      "market": "FEX",           // FES fondos españoles, FEX fondos extranjeros
      "currency": "EUR",
      "detail": {                // solo órdenes completadas
        "relatedOperations": [
          {
            "operationNumber": "…",   // el número de operación del bróker (9 dígitos)
            "executionDate": "…",     // día del valor liquidativo
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
      "operation": "COMPRA RV CONTADO",  // o VENTA RV CONTADO; el resto aún no se importa
      "marketId": "NYS",                 // NYS, NDQ, XTR, BMA, TOR
      "detail": {                        // solo órdenes completadas
        "instrumentIsin": "US…",
        "instrumentName": "…",
        "instrumentCurrency": "USD",
        "executionDate": "…",
        "finishDate": "…",               // día de liquidación
        "executedShares": 10,
        "netAmountCurrency": 4809.72,    // neto de comisiones, en la divisa del instrumento
        "netAmountEUR": 4122.03          // lo que pagó o cobró la cuenta
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
          "operationType": "ABONO DE DIVIDENDO", // la etiqueta del propio bróker
          "concept": "…",                        // la descripción del propio bróker
          "amount": 3.79,
          "flowType": "IN",                      // IN u OUT; el signo sale de aquí
          "currency": "EUR",
          "totalBalance": 26.67,                 // saldo acumulado tras el movimiento
          "operationRef": "…"                    // lleva el número de operación en los movimientos de valores
        }
      ]
    }
  ]
}
```

Notas de MyInvestor:

- Los movimientos de los últimos 90 días llegan al momento; un rango más largo necesita que el
  titular lo apruebe en la app de MyInvestor (el adaptador envía la solicitud y la espera).
- Las órdenes de un rango largo se piden por ventanas de un año y se deduplican por `reference` /
  `id`; el paquete es el mismo que con un único rango.
- El importe del listado de órdenes de fondos es una estimación al dar la orden; el importe
  ejecutado está en `detail.relatedOperations`.
- Los dividendos solo llegan como movimientos de efectivo, netos de retención.
