# MyInvestor sin Inversis: la extensión basta sola

- Objetivo: una importación o actualización de MyInvestor hecha solo con la extensión termina
  siempre, sin pedir ficheros de Inversis. Lo que la API de MyInvestor no da se deduce de lo que
  sí da (efectivo, órdenes, posiciones actuales, catálogo de operaciones corporativas de Financial
  Hub) o se pregunta al usuario en la vista previa con respuestas cerradas. Nunca un error ni un
  «sube el fichero de Inversis».
- Decisión del usuario (2026-11-08): la extensión no convive con Inversis, lo reemplaza. Hay
  usuarios que no pueden entrar en Inversis (el propio usuario: su acceso falla) y la
  actualización no debe depender de entrar en Inversis. Subir ficheros de Inversis sigue siendo
  posible por su propio camino, pero no es la solución de la extensión.
- Principio: un solo importador. El paquete se traduce a las mismas filas que un fichero de
  Inversis (`decode/api-bundle.ts`); lo que no se puede traducir porque el dato no existe en la
  API se resuelve con el mismo modelo de eventos que ya usa Inversis (mismos tipos, misma
  contabilidad), marcado como deducido o respondido por el usuario.
- Repositorios: extensión (leer más de la API), serverful (`packages/broker-import`, deducción y
  preguntas), web (textos y preguntas de la vista previa con la extensión).
- Documento hermano: `myinvestor-extension-modos.md` (modos y lectura con el popup cerrado,
  fusionado y desplegado).

## Qué da la API de MyInvestor (explorado el 2026-11-08 con la cuenta del usuario)

| Fuente | Ruta | Qué trae |
| --- | --- | --- |
| Efectivo | `account/api/v3/account/{id}/flows` | Los mismos movimientos que el fichero de efectivo de Inversis (las claves de hecho coinciden), con `operationRef` y `operationClass`. Más de 90 días pide firma PSD2. |
| Órdenes de fondos | `cperf-server/api/v3/securities-accounts/{id}/orders` | Suscripciones, reembolsos y traspasos internos y externos, con sus ejecuciones (un lote por ejecución). |
| Órdenes de acciones | `broker/v2/stock-orders` (+ detalle) | Compras, ventas al contado y `TRASPASO RV LIBRE DE PAGO` (sin sentido de entrada o salida). |
| Eventos | `broker/v2/financial-events` | Solo eventos pendientes de decidir; vacío para el histórico. |
| No existe | — | Ningún listado de operaciones de valores: altas y bajas de derechos, splits, canjes, fusiones, dividendos en acciones, equiparaciones, ajustes, bloqueos. La web solo enlaza a `inversis.com/cbmyinvestor`. |
| Sin leer aún | `pension-accounts`, `v2/portfolios`, `deposits`, posiciones (`securities-accounts/{id}/positions`) | Existen; la extensión todavía no los lee. |

## Inventario: lo que contempla el importador de Inversis frente a la API

Columna «API»: **sí** (llega tal cual), **efectivo** (solo su movimiento de efectivo, con nombre y
cantidad en el concepto), **parcial**, **no**.

| Tipo de Inversis (`normalize/taxonomy.ts`) | API | Propuesta |
| --- | --- | --- |
| Todo el efectivo (transferencias, intereses, comisiones, impuestos, dividendos en efectivo, depósitos, picos, diferencias de cambio, retenciones) | sí | Ya cubierto. |
| Apertura de la cuenta (fila `APERTURA` o saldo inicial a cero) | parcial | La respuesta de `flows` trae `startBalance` y `endBalance`, que la extensión no guarda: el paquete los lleva y el lector emite el saldo inicial, que prueba la apertura como en Inversis. Hoy toda importación desde cero con la extensión pide «el historial desde la apertura». |
| Compra y venta de acciones | sí | Ya cubierto (fecha de liquidación del efectivo, serverful#1674). |
| Suscripción, reembolso, traspasos de fondos internos y externos | sí | Ya cubierto (un lote por ejecución, serverful#1673). |
| Venta de derechos (`VENTA DE VALORES` «X DERECHOS @ n» sin orden) | efectivo | Deducir el ciclo de derechos que ya usa Inversis: alta gratuita de n derechos y su venta, ganancia completa a coste cero. Si el concepto no deja claro que son derechos, preguntar. |
| Suscripción con derechos (`SUSCRIPCION R V`) y ejercicio | efectivo | Deducir acciones recibidas del concepto y del efectivo; confirmar con la posición actual; si no cuadra, preguntar cantidad. |
| Derechos que caducan, alta de derechos sin venta ni ejercicio | no | Sin efecto económico: no hace falta registrarlos. |
| Venta en OPA (`VENTA OPA`) | efectivo | Deducir la venta desde el concepto (nombre y títulos) y el importe. |
| Dividendo en acciones, entrega gratuita, scrip | no | Deducir del catálogo de operaciones corporativas de Financial Hub y de la posición actual; si no hay datos, preguntar. |
| Split, contrasplit, canje, fusión de fondos, equiparación | no | Catálogo de operaciones corporativas de Financial Hub (el compilador ya lo recibe) contrastado con la posición actual; si falta, preguntar. |
| Traspaso de acciones libre de pago | parcial | Deducir el sentido: con posición previa y sin posición actual es salida; si no, preguntar «entrada o salida» y, si es entrada, el coste fiscal. |
| Recepción y entrega de custodia, liquidaciones de traspaso de valores | efectivo | Se emparejan con el traspaso deducido. |
| Ajuste de posición, bloqueos y desbloqueos | no | Sin efecto económico salvo el ajuste: el ajuste sale de comparar con la posición actual. |
| Cambio de clase de un fondo (switch), movimiento interno | por comprobar | Ver si las órdenes de fondos los traen; si no, posición actual y preguntar. |
| Planes de pensiones | sin leer | La extensión lee `pension-accounts`. |
| Cartera gestionada o roboadvisor | sin leer | La extensión lee `v2/portfolios`. |
| Depósitos a plazo | sin leer | La extensión lee `deposits` (el efectivo ya los muestra). |

Regla general de último recurso: lo que no se pueda deducir ni preguntar con sentido se registra
como «sin explicar» con su efecto en efectivo, visible en la cartera para revisarlo, en lugar de
bloquear la importación.

## Requisitos

- **R-sin-ficheros.** Una sesión que solo tiene el paquete de la extensión nunca pide un fichero
  de Inversis: las peticiones de ficheros se convierten en deducciones o en preguntas.
- **R-deducido.** Toda fila deducida lleva su origen (`deducido de efectivo`, `deducido de
  posición`, `catálogo corporativo`) y la vista previa lo enseña.
- **R-preguntas.** Las preguntas tienen respuestas cerradas y usan el flujo de resoluciones que ya
  existe en la vista previa.
- **R-posiciones.** La extensión lee las posiciones actuales y el servidor contrasta con ellas el
  resultado; una diferencia se explica o se pregunta.
- **R-más-productos.** Pensiones, carteras gestionadas y depósitos se leen de la API.
- **R-mismo-modelo.** Lo deducido usa los mismos tipos de evento y la misma contabilidad que su
  equivalente de Inversis.

## Tareas

| Tarea | Repos | Estado | Evidencia |
| --- | --- | --- | --- |
| Inventario y propuesta (este documento) | extensión | hecha; el usuario aprobó empezar (2026-11-08) | |
| Paso de ficheros con la extensión sin botones ni textos de Inversis | web | pendiente | |
| Venta de derechos deducida del efectivo | serverful | en curso, rama `fix/myinvestor-bundle-rights-sale` | `import-journeys.test.ts` «deduces a free grant of the rights sold…» (rojo sin el cambio); con el paquete real del usuario no queda ninguna liquidación de acciones sin operación |
| Apertura probada con el saldo inicial de `flows` | extensión, serverful | pendiente | |
| Traspaso libre de pago con sentido deducido o preguntado | serverful, web | pendiente | |
| Leer posiciones actuales y contrastar | extensión, serverful | pendiente | |
| Operaciones corporativas sin rastro desde el catálogo | serverful | pendiente | |
| Pensiones, carteras gestionadas y depósitos | extensión, serverful | pendiente | |

## Registro

- 2026-11-08 Importación desde cero real: rechazada por traspasos en varios lotes (arreglado,
  serverful#1673) y 14 compras en USD sin cruzar (arreglado, serverful#1674). Queda una venta de
  derechos de Amper (julio de 2025) sin orden en la API y dos traspasos libres de pago sin
  sentido. Exploración de la web y la API de MyInvestor: no hay listado de operaciones de
  valores. El usuario decide que la extensión reemplace a Inversis.
