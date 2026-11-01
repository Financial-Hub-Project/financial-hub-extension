---
name: empezar
description: "Trigger: instala esto, instalar la extensión, clona el repo, empezar, probar en local. Instala la extensión en local y la deja lista en el Chrome del usuario."
license: MIT
metadata:
  author: financial-hub
  version: "1.0"
---

## Activation Contract

Cárgala cuando el usuario te pase la URL del repositorio o pida instalar la extensión.

## Hard Rules

- Habla en español y sin jerga: el usuario puede no ser técnico.
- No pidas ni escribas contraseñas; el usuario inicia sesión en su bróker.
- Chrome no deja instalar extensiones sin publicar de forma automática: guía al usuario clic a clic y espera su confirmación.
- No modifiques nada fuera de la carpeta del repositorio.

## Decision Gates

| Situación | Acción |
| --- | --- |
| No hay repositorio en la carpeta | `git clone https://github.com/Financial-Hub-Project/financial-hub-extension` |
| Falta Node 20+ | Sigue sin Node: las comprobaciones son opcionales para usarla |
| Ya estaba instalada | Pide recargarla en `chrome://extensions` y recargar la pestaña del bróker |

## Execution Steps

1. Clona o actualiza el repositorio (`git pull`).
2. Si hay Node 20+: `npm run check` y `npm test`; si fallan, para y explica el error.
3. Dale la ruta absoluta de la carpeta y guíale: `chrome://extensions` → **Modo de desarrollador** → **Cargar descomprimida** → esa carpeta → fijar la extensión.
4. Pide que confirme que ve el icono de Financial Hub.
5. Pregunta qué quiere hacer y carga la skill que toque (ver `AGENTS.md`); si solo quiere usarla, enlaza la guía de su bróker en `docs/brokers/`.

## Output Contract

Devuelve: carpeta instalada, resultado de las comprobaciones, si el usuario confirmó la instalación y el siguiente paso.

## References

- [README.md](../../../README.md) — instalación.
- [AGENTS.md](../../../AGENTS.md) — qué skill usar para cada petición.
