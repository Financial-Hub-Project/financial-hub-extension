# MyInvestor: importar desde cero o actualizar, sin perder la lectura al cerrar el popup

- Objetivo: la extensión distingue entre importar una cartera nueva desde cero y actualizar los
  movimientos de una cartera existente; una lectura larga (con firma PSD2) sigue aunque se cierre
  el popup; los rangos largos de órdenes se leen por ventanas; y Financial Hub (web y servidor)
  preselecciona la cartera y detecta huecos.
- Documento dueño del frente en tres repositorios. Los hilos de web y servidor lo enlazan; no lo
  copian.
- Ramas: `myinvestor-extension-modos` en `financial-hub-extension` (base `e631e13`),
  `myinvestor-extension-modos-web` en `financial-hub-web` y
  `myinvestor-extension-modos-serverful` en `financial-hub-serverful`.
- Autorización del hilo de la extensión: commits, push de su rama y PR en draft. Sin marcar ready,
  sin fusionar, sin tocar otros repositorios ni producción, sin datos reales.
- Formato del paquete: `financial-hub/myinvestor-api`, versión 1, **sin cambios** (el servidor ya
  lo decodifica).

## Contrato `?modo=` entre extensión y web

Al entregar un paquete, la extensión abre la importación de Financial Hub con el modo elegido:

| Modo en el popup | URL que abre |
| --- | --- |
| Actualizar una cartera (por defecto) | `${origin}/carteras/importar?broker=myinvestor&modo=actualizar` |
| Importar desde cero | `${origin}/carteras/importar?broker=myinvestor&modo=nueva` |

- `origin` es `https://financial-hub.es` o el que haya en `chrome.storage.local.origin` (pruebas
  en local).
- Una web que aún no entiende `modo` lo ignora y la importación funciona como hoy.
- No cambian ni el paquete ni los mensajes de ventana (`financial-hub:import-ready`,
  `financial-hub:myinvestor-api-bundle`).

## Unidades

| Unidad | Repositorio y rama | Requisitos | Estado | Evidencia |
| --- | --- | --- | --- | --- |
| Extensión | `financial-hub-extension`, `myinvestor-extension-modos` | E1–E6 | en curso | |
| Web | `financial-hub-web`, `myinvestor-extension-modos-web` | W1–W2 | otro hilo | |
| Servidor | `financial-hub-serverful`, `myinvestor-extension-modos-serverful` | S1–S2 | otro hilo | |

### Tareas de la extensión

| Tarea | Requisitos | Estado | Evidencia |
| --- | --- | --- | --- |
| Órdenes por ventanas de un año, sin duplicados y con páginas | E4 | hecha | `src/brokers/myinvestor/lists.js`, `test/myinvestor-lists.test.mjs`; `npm test` 8/8 |
| Modos «Actualizar» / «Desde cero» y aviso de hueco | E1, E3 | pendiente | |
| Lectura que no depende del popup y pestaña sin content script | E2, E5 | pendiente | |
| Documentación de uso, contribución y privacidad | E1–E6 | pendiente | |

## Requisitos

### Extensión

- **E1. Modo explícito.** El popup ofrece «Actualizar una cartera» (por defecto: últimos 90 días,
  sin firma, con la opción de elegir otra fecha de inicio) e «Importar desde cero» (pide la fecha
  de apertura de la cuenta o una anterior y explica que MyInvestor pedirá una firma PSD2 en la app
  del móvil). Al entregar abre la URL del contrato `?modo=`.
- **E2. Cerrar el popup no pierde la lectura.** El popup solo arranca el trabajo. El content script
  de MyInvestor lee la cuenta y, al acabar, envía el resultado al service worker con un mensaje
  nuevo, que lo despierta aunque Chrome lo hubiera parado (ninguna promesa abierta de minutos). El
  service worker valida (`validate.js`), guarda el paquete pendiente en `chrome.storage.session` y
  abre Financial Hub. El progreso y el último estado o fallo quedan en `chrome.storage.session`:
  al reabrir, el popup enseña en qué va la lectura, el error y «Copiar informe para una issue».
  «Descargar el paquete (pruebas)» descarga si el popup está abierto al acabar; si no, al
  reabrirlo ofrece guardarlo. Pulsar otra vez durante una lectura no arranca otra. El token nunca
  sale de la página; `chrome.storage.session` solo guarda el paquete ya validado, el estado y los
  mensajes.
- **E3. Aviso de hueco en modo actualizar.** `chrome.storage.local` guarda solo la fecha `to` de la
  última entrega correcta por bróker, sin datos de la cuenta. Si esa fecha no existe o tiene más de
  89 días, el popup avisa de que los últimos 90 días pueden dejar un hueco y propone «Desde <esa
  fecha>», con su firma. La comprobación autoritativa es del servidor (S2).
- **E4. Rangos largos por ventanas.** Las órdenes de fondos
  (`/cperf-server/api/v3/securities-accounts/{id}/orders`) y de acciones (`/broker/v2/stock-orders`)
  se piden por ventanas de fechas consecutivas de un año y se deduplican por `reference` / `id`.
  Los movimientos de efectivo (`flows`) siguen en una petición por cuenta (cada petición de más de
  90 días exige una firma). Si una respuesta trae señales de paginación, se recorren; si no se
  pueden recorrer, la lectura falla con un mensaje claro en lugar de entregar una lista a medias.
- **E5. Pestaña sin content script.** Si la extensión se recargó y la pestaña no, el popup dice
  «Recarga la pestaña de MyInvestor».
- **E6. Sin cambios de formato ni permisos nuevos** en `manifest.json`, salvo que sea imprescindible
  (y entonces se justifica en el PR).

### Web (hilo de `financial-hub-web`)

- **W1. Parámetro `modo`.** La importación de MyInvestor lee `modo=nueva` o `modo=actualizar`; un
  valor ausente o desconocido mantiene el comportamiento actual.
- **W2. Preselección de cartera.** `nueva` lleva a crear una cartera; `actualizar` preselecciona la
  cartera de MyInvestor existente. El usuario sigue eligiendo y confirmando la vista previa.

### Servidor (hilo de `financial-hub-serverful`)

- **S1. Efectivo del día frontera.** Un paquete que empieza en la fecha `to` de la entrega anterior
  (o se solapa con ella) no duplica ni pierde los movimientos de efectivo de ese día.
- **S2. Detección de huecos.** La importación detecta si entre la última entrega y el inicio del
  paquete queda un hueco y lo avisa; es la comprobación autoritativa que complementa E3.

## Qué comprobar con datos reales (E4)

No hay acceso a una cuenta real desde el desarrollo. Con la cuenta del usuario, sin compartir
ningún valor, solo recuentos:

- **Recuentos.** Órdenes de fondos, órdenes de acciones y movimientos por cuenta de efectivo del
  paquete frente a lo que muestra MyInvestor para el mismo rango.
- **Ventanas.** Si los dos endpoints de órdenes aceptan una ventana de un año, si limitan el rango
  (un código 400/422, una lista recortada o vacía en las ventanas antiguas) y si alguna orden
  aparece en dos ventanas (la deduplicación la quita; basta con que los recuentos cuadren).
- **Paginación.** Con «Empezar a explorar» en las páginas de órdenes y movimientos, si las
  respuestas traen campos de paginación (`totalElements`, `totalPages`, `page`, `hasNext`,
  `last`…) y con qué parámetro se piden las páginas siguientes. La extensión solo sigue `page`
  cuando la respuesta confirma la página pedida; cualquier otra señal de «hay más» hace fallar la
  lectura con el nombre de la señal en el informe.
- **Movimientos de varios años.** Si `flows` llega completo en una sola petición firmada o
  recortado, y si una cuenta en otra divisa pide su propia firma.
- **Órdenes antiguas.** Si una ventana de órdenes de hace años responde 202 (pide firma) en lugar
  de 200.

## Prueba manual pendiente con la cuenta real

La hace el usuario en su navegador; la contraseña la escribe él. Solo se apuntan recuentos.

1. **Instalar o recargar.** `chrome://extensions` → **Cargar descomprimida** (o el icono de
   recargar de la tarjeta). Abre el popup en una pestaña de MyInvestor que ya estaba abierta antes
   de recargar: debe decir «Recarga la pestaña de MyInvestor». Recárgala e inicia sesión.
2. **Desde cero con descarga.** Popup → «Importar desde cero», fecha de apertura de la cuenta (o
   anterior) → **Descargar el paquete (pruebas)**. Aprueba la firma en el móvil. Comprueba
   `npm run validate -- ~/Downloads/myinvestor-bundle-<fecha>.json` y compara los recuentos con la
   web de MyInvestor (sección anterior).
3. **Sincronizar a una cartera nueva.** Repite «Importar desde cero» con **Sincronizar con
   Financial Hub**. La pestaña que se abre lleva `modo=nueva`; importa en una cartera de pruebas y
   revisa *Nuevos*, *Ya importados*, *Bloqueados* y el efectivo.
4. **Actualizar esa cartera.** Popup → «Actualizar una cartera» (últimos 90 días): no debe salir
   el aviso de hueco ni pedir firma; la pestaña lleva `modo=actualizar` y la vista previa enseña
   lo ya importado como *Ya importados*.
5. **Cerrar el popup durante la firma.** Lanza una lectura que pida firma (desde cero o «Desde»
   una fecha de hace más de 90 días), cierra el popup haciendo clic fuera, aprueba en el móvil y
   reabre el popup: enseña la lectura en curso y después el resultado; Financial Hub se abre solo.
   Con **Descargar** y el popup cerrado al acabar, al reabrirlo ofrece «Guardar el paquete».
6. **Pulsar dos veces.** Con una lectura en curso, los botones están desactivados y otro popup
   (otra ventana) responde que ya hay una lectura en curso.
7. Borra los paquetes descargados al terminar.

## Registro

- 2026-11-07 Creado el frente con las tres unidades y el contrato `?modo=`. La extensión empieza
  por E4 (ventanas de órdenes) y sigue con E1–E3 y E5.
- 2026-11-07 E4 hecha: las órdenes de fondos y de acciones se piden por ventanas de 365 días y se
  deduplican por `reference` / `id`. `readPages` sigue `page` solo si la respuesta confirma la
  página pedida; cualquier otra señal de «hay más» (también en `flows`) hace fallar la lectura con
  los nombres de las señales. Las rutas de los mensajes de error cambian los ids por `{id}`, porque
  el informe de fallo va a issues públicas.
