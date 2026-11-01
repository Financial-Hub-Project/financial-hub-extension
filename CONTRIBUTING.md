# Contribuir: añadir un bróker, probarlo y arreglarlo

La extensión es un conjunto de **adaptadores de bróker** pequeños alrededor de un núcleo común. Un
adaptador lee la cuenta desde la propia web del bróker, en la pestaña del usuario con la sesión
iniciada, y devuelve un **paquete**: un documento JSON con las órdenes y los movimientos de efectivo
que necesita Financial Hub. El núcleo valida el paquete y se lo entrega a Financial Hub, o lo
guarda en local mientras desarrollas.

Puedes construir y probar un adaptador de principio a fin con tu propia cuenta sin ningún backend de
Financial Hub: el botón **Descargar el paquete** del popup y `npm run validate` es todo lo que
necesitas. Importar el paquete de un bróker nuevo en Financial Hub requiere además que el equipo de
Financial Hub acepte el formato en su lado; ver [Llevarlo a Financial Hub](#llevarlo-a-financial-hub).

Si trabajas con un agente (Claude Code, Codex…), tiene dos skills con este mismo procedimiento:
`.claude/skills/contribuir-broker` y `.claude/skills/probar-extension` (ver `AGENTS.md`).

## Cómo encaja todo

```text
pestaña del bróker (tu sesión)            extensión                         pestaña de Financial Hub
┌──────────────────────────┐   collect   ┌──────────────────────┐  entrega  ┌──────────────────────┐
│ src/brokers/<id>/        │ ◀────────── │ src/popup.js         │ ────────▶ │ src/financial-hub.js │
│   hook.js    (opcional)  │ ──paquete─▶ │   validate.js        │  storage  │  pasa el paquete a   │
│   content.js (adaptador) │             │ src/background.js    │  sesión   │  la importación      │
└──────────────────────────┘             └──────────────────────┘           └──────────────────────┘
```

- `src/brokers.js`: el registro. Una entrada por bróker: id, nombre, páginas en las que se ejecuta,
  formato del paquete y si Financial Hub ya puede importarlo.
- `src/brokers/<id>/content.js`: el adaptador. Un content script en las páginas del bróker que
  responde al mensaje `collect` del popup con un paquete.
- `src/brokers/<id>/hook.js` (opcional): un script en el mundo de la propia página, para valores que
  la web solo guarda en memoria (MyInvestor: la cabecera con el id del dispositivo). Mantenlo
  mínimo y no leas nunca secretos.
- `src/validate.js`: las comprobaciones del paquete (sobre común, forma de cada bróker, sin
  credenciales).
- `src/popup.js`, `src/background.js`, `src/financial-hub.js`: el núcleo común; no deberías
  necesitar tocarlos para un bróker nuevo.
- `docs/formato-del-paquete.md`: los formatos de paquete.

## Añadir un bróker, paso a paso

1. **Mapea la web del bróker.** Inicia sesión en el bróker en Chrome, abre DevTools → **Red**,
   filtra por `Fetch/XHR` y recorre las páginas que muestran tus órdenes, ejecuciones y movimientos
   de efectivo. Apunta de cada una la URL, los parámetros (fechas, ids de cuenta, paginación), los
   campos de la respuesta y cómo se autentica la página (un token en `localStorage`, una cookie, una
   cabecera). Busca:
   - cada orden con su **ejecución** (fecha, cantidad, precio o importe neto, comisiones, divisa);
   - cada **movimiento de efectivo** con fecha, tipo, descripción, importe con signo y, si existe,
     el saldo acumulado;
   - una **referencia** estable por orden y por movimiento (permite a Financial Hub no duplicar);
   - los límites: rangos de fechas, paginación, confirmaciones extra (MyInvestor pide aprobar en la
     app a partir de 90 días).
2. **Documenta el formato del paquete** en `docs/formato-del-paquete.md`: un nombre de `format`
   (`financial-hub/<broker>-api`), `version: 1` y los campos que vas a enviar. Envía solo lo que
   Financial Hub necesita (ver [Reglas](#reglas)).
3. **Registra el bróker** en `src/brokers.js` con `supported: false` hasta que Financial Hub acepte
   el formato. El popup entonces solo ofrece **Descargar el paquete** para él.
4. **Añade el adaptador** en `src/brokers/<id>/content.js`, partiendo del de MyInvestor:
   - responde a `chrome.runtime.onMessage` `{ type: 'collect', from? }` con
     `{ ok: true, bundle: <cadena JSON> }` o `{ ok: false, error: <mensaje para el usuario> }`, y
     devuelve `true` desde el listener (la respuesta es asíncrona);
   - informa del progreso con `chrome.runtime.sendMessage({ type: 'progress', line })`;
   - llama a la API del bróker con `fetch` desde el content script: se ejecuta con el origen de la
     página, así que se aplican las reglas CORS del propio bróker y funcionan las cookies o el token
     que usa la página;
   - construye el paquete con una lista explícita de campos por objeto (`pick` en el adaptador de
     MyInvestor), nunca copiando la respuesta de la API entera.
5. **Conéctalo en `manifest.json`**: una entrada en `content_scripts` para las páginas del bróker
   (y el `hook.js` opcional con `"world": "MAIN"` y `"run_at": "document_start"`), y
   `host_permissions` para las páginas y el host de la API.
6. **Añade su comprobación de forma** en `SHAPES` de `src/validate.js` y un test en `test/` con un
   paquete sintético (valores inventados, nunca tus datos reales).
7. Ejecuta `npm run check` y `npm test`, y pruébalo con tu cuenta (siguiente apartado).

## Probarlo

Sin compilación ni dependencias: Node 20+ para las comprobaciones y Chrome para lo demás.

```bash
npm run check   # todos los scripts compilan, existen los ficheros del manifest, cada bróker está conectado
npm test        # validación de paquetes y registro de brókers
```

Con tu propia cuenta:

1. `chrome://extensions` → **Cargar descomprimida** (la primera vez) o el icono de **recargar** de la
   tarjeta de la extensión tras cada cambio. Recarga también la pestaña del bróker, para que se
   inyecte el nuevo content script.
2. Abre el bróker, inicia sesión y pulsa la extensión → **Descargar el paquete (pruebas)**.
3. Comprueba el fichero: `npm run validate -- ~/Downloads/<id>-bundle-<fecha>.json`.
4. Ábrelo y compara algunas órdenes y movimientos con lo que muestra el bróker: fechas, cantidades,
   importes, signos y divisa.
5. Si el bróker ya está soportado, prueba también **Sincronizar con Financial Hub** y lee la vista
   previa de la importación: *Nuevos*, *Ya importados*, *Bloqueados* y el efectivo frente al bróker.
   No confirmes la importación en una cartera que no sea de pruebas.

Para probar contra un Financial Hub local, apunta la extensión a él desde la consola del service
worker (`chrome://extensions` → la extensión → **Inspeccionar vistas: service worker**):

```js
chrome.storage.local.set({ origin: 'http://localhost:3000' }); // volver: chrome.storage.local.remove('origin')
```

## Arreglar lo que falle

Dónde mirar:

- **Errores del adaptador**: la consola de DevTools de la pestaña del bróker (los content scripts
  escriben ahí) y su pestaña **Red**, con las llamadas a la API y sus códigos de estado.
- **Errores del popup**: clic derecho en el popup → **Inspeccionar**.
- **Service worker** (la entrega a Financial Hub): `chrome://extensions` → **Inspeccionar vistas:
  service worker**.
- **Lado de Financial Hub**: la consola de la página de importación; la vista previa enseña qué se
  leyó, qué es nuevo y qué bloquea.

Problemas habituales:

| Síntoma | Causa | Arreglo |
| --- | --- | --- |
| "Abre esta ventana desde la web de tu bróker…" | La pestaña activa no es una página de un bróker registrado | Abre la web del bróker; revisa `pages` en `src/brokers.js` |
| "Could not establish connection. Receiving end does not exist." | El content script no está en esa pestaña (se instaló o recargó después de abrirla) | Recarga la pestaña del bróker |
| "La sesión … ha caducado" / HTTP 401 | Caducó el token del bróker | Recarga la web del bróker (renueva la sesión) y repite |
| HTTP 202 en vez de datos (MyInvestor) | El rango necesita aprobación en la app | Aprueba la solicitud en la app del bróker; deja el popup abierto |
| No llega nada al móvil (MyInvestor) | La firma se creó pero no se envió | Navega un momento por el bróker para que `hook.js` aprenda el id de dispositivo y repite |
| "El paquete no es válido: …" | El adaptador generó una forma incorrecta o una clave prohibida | Arregla el adaptador; `npm run validate` sobre el fichero descargado enseña todos los problemas |
| Error de CORS en la consola | La API rechaza peticiones desde el origen de la página | Llama a la API que usa la propia web, desde el content script, no desde el service worker |
| Se abre Financial Hub pero no aparece el fichero | La importación está en otro origen distinto del configurado, o no está en el paso de subida de ese bróker | Revisa `origin` en el almacenamiento del service worker; abre la importación del bróker desde el principio |
| Se cerró el popup y se paró la sincronización | Chrome cierra los popups al perder el foco | Deja el popup abierto hasta que termine (limitación conocida) |

Cuando informes de un fallo, incluye la versión de la extensión, el bróker, el paso, el error de
consola y el código HTTP. Nunca pegues un paquete real, un token ni capturas con tus datos.

## Llevarlo a Financial Hub

Financial Hub tiene que entender un formato de paquete nuevo antes de poder activar el botón
**Sincronizar** (`supported: true`). Abre una issue o un pull request con:

- el adaptador y su entrada en `src/brokers.js` (`supported: false`);
- el formato en `docs/formato-del-paquete.md`;
- un paquete de ejemplo **anonimizado**: misma estructura y formas realistas, pero valores
  inventados (nombres e ISIN de instrumentos públicos valen; importes, fechas y referencias,
  inventados);
- qué has comprobado con tu cuenta (número de órdenes y movimientos, cualquier rareza).

El equipo de Financial Hub añade el formato en su lado y activa el bróker.

## Reglas

- **Nunca toques credenciales.** No leas, guardes ni envíes contraseñas, PIN, códigos de un solo
  uso, cookies de sesión ni tokens. Usa la sesión que ya tiene la página, desde la propia página.
- **Envía lo mínimo.** Solo los campos que Financial Hub necesita; ni números de cuenta, ni DNI, ni
  direcciones, ni nada que identifique al titular.
- **Solo al pulsar.** Nada de sondeos en segundo plano, sincronizaciones programadas, analítica ni
  código remoto.
- **Permisos estrechos.** Solo las páginas del bróker y el host de su API.
- **Nada de datos reales en el repositorio.** Tests y ejemplos con valores inventados.
- **Convenciones del código.** JavaScript sin dependencias ni compilación; identificadores y
  comentarios del código en inglés; textos para el usuario y documentación en español; commits
  con [Conventional Commits](https://www.conventionalcommits.org/es/) (`feat:`, `fix:`, `docs:`…).
