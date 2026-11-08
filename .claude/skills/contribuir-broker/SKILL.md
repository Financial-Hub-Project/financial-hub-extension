---
name: contribuir-broker
description: "Trigger: añadir bróker, nuevo adaptador, cambiar adaptador, contribuir, soportar otro bróker. Añade o modifica un adaptador de bróker con las reglas del proyecto."
license: MIT
metadata:
  author: financial-hub
  version: "1.1"
---

## Activation Contract

Cárgala antes de crear o cambiar un adaptador en `src/brokers/<id>/`, su entrada en
`src/brokers.js`, su guía en `docs/brokers/<id>.md`, su formato en `docs/formato-del-paquete.md`
o su comprobación en `src/validate.js`.

## Hard Rules

- Nunca leas, guardes ni envíes contraseñas, PIN, códigos, cookies ni tokens; usa la sesión de la página desde la página.
- Construye el paquete con listas explícitas de campos (`pick`); nunca copies una respuesta de la API entera.
- No envíes números de cuenta, DNI, direcciones ni nada que identifique al titular.
- Solo actúa al pulsar el usuario: sin sondeos, tareas programadas, analítica ni código remoto.
- Permisos solo para las páginas del bróker y su API; nada de `<all_urls>`.
- Un bróker nuevo entra con `supported: false` hasta que Financial Hub acepte su formato.
- Sin dependencias ni compilación; código e identificadores en inglés; textos de usuario y documentación en español.
- Tests y ejemplos con valores inventados; nunca datos reales en el repositorio.
- Commits con Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`).

## Decision Gates

| Caso | Acción |
| --- | --- |
| Bróker nuevo | Registro, adaptador, manifest, guía, formato, `SHAPES`, test (pasos 1–8) |
| Hay mapa de la API (issue o `explorar-broker`) | Úsalo como fuente; si falta una llamada, pide explorar esa página |
| Cambio de campos del paquete | Incrementa `version` si rompe; actualiza formato, `SHAPES` y test |
| Valor solo en memoria de la web | `hook.js` en `"world": "MAIN"`, mínimo y sin secretos |
| Rango que pide confirmación al usuario | Avísalo en el popup con `recentDays`; espera la confirmación, no la saltes |

## Execution Steps

1. Parte del mapa de la API (`explorar-broker`): llamadas de órdenes, ejecuciones, movimientos y posiciones, parámetros, cabeceras de autenticación y límites.
2. Documenta `format`, `version: 1` y los campos en `docs/formato-del-paquete.md`.
3. Añade la entrada en `src/brokers.js` (`supported: false`).
4. Escribe `src/brokers/<id>/content.js` partiendo del de MyInvestor: responde a `collect` en el acto con `{ ok: true }`, informa con `progress`, envía el resultado con `collected` (`{ ok: true, bundle }` o `{ ok: false, error }`) y responde a `collect-status` (contrato en `CONTRIBUTING.md`, paso 4).
5. Conecta `content_scripts` y `host_permissions` en `manifest.json`.
6. Añade la forma en `SHAPES` de `src/validate.js` y un test sintético en `test/`.
7. Crea `docs/brokers/<id>.md` desde `docs/brokers/_plantilla.md` y añade el bróker a la tabla del README.
8. Prueba con la skill `probar-extension` y abre el PR con `resolver-issue`.

## Output Contract

Devuelve: ficheros cambiados, formato y versión del paquete, campos enviados y por qué hace falta cada uno, resultado de `npm run check` y `npm test`, y lo que queda pendiente en Financial Hub.

## References

- [CONTRIBUTING.md](../../../CONTRIBUTING.md) — arquitectura, pasos y errores habituales.
- [PRIVACY.md](../../../PRIVACY.md) — qué se lee, se envía y nunca se toca.
- [docs/formato-del-paquete.md](../../../docs/formato-del-paquete.md) — formatos de paquete.
- [docs/brokers/_plantilla.md](../../../docs/brokers/_plantilla.md) — guía de cada bróker.
