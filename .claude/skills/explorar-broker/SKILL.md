---
name: explorar-broker
description: "Trigger: proponer bróker, nuevo bróker, explorar web del bróker, mapa de la API, ampliar bróker. Mapea la API de un bróker sin datos del usuario y abre la issue."
license: MIT
metadata:
  author: financial-hub
  version: "1.0"
---

## Activation Contract

Cárgala cuando el usuario quiera proponer un bróker o una parte que falta de uno (planes de pensiones, carteras gestionadas…).

## Hard Rules

- Nunca copies valores de la cuenta del usuario: solo rutas, nombres de parámetros y campos, tipos y códigos HTTP.
- El mapa sale de `src/explorer.js` (botones **Empezar a explorar** y **Descargar mapa de la API**); no inventes tu propio volcado de red ni pidas ficheros HAR (llevan tokens).
- El usuario inicia sesión él mismo.
- Revisa el mapa antes de publicarlo: si ves un valor que no sea un tipo, para y avisa.

## Decision Gates

| Situación | Acción |
| --- | --- |
| Tienes herramientas de navegador en la pestaña del usuario | Ejecuta `startRecording` de `src/explorer.js` en la página (mundo principal), pide al usuario que navegue y lee `readRecording`; arma el mapa con `apiMap` |
| No las tienes | Guía al usuario por los botones del popup y pídele el fichero `mapa-api-….json` |
| El bróker ya existe | Issue **Mejora de un bróker**; explora solo las páginas de ese producto |

## Execution Steps

1. Asegura la instalación (skill `empezar`).
2. Con la sesión iniciada en el bróker, empieza a explorar y pide recorrer, **sin recargar**, órdenes, ejecuciones, movimientos de efectivo, posiciones y la parte que falte.
3. Descarga o arma el mapa y revísalo.
4. Crea la issue con la plantilla que toque (`gh issue create --template nuevo-broker.yml` o `mejora.yml`), con el mapa en un bloque `<details>` y lo que contó el usuario (productos, confirmaciones, 2FA).
5. Si el usuario quiere seguir, pasa a `contribuir-broker`.

## Output Contract

Devuelve: enlace de la issue, número de rutas del mapa, qué tipos de datos aparecen (órdenes, ejecuciones, efectivo, posiciones) y qué falta.

## References

- [src/explorer.js](../../../src/explorer.js) — grabación sin valores.
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) — flujo de colaboración.
