---
name: resolver-issue
description: "Trigger: resolver issue, arreglar la issue #, hacer PR, pull request, implementar petición. Lleva una issue a un PR probado siguiendo el flujo del proyecto."
license: MIT
metadata:
  author: financial-hub
  version: "1.0"
---

## Activation Contract

Cárgala para convertir una issue (fallo, nuevo bróker o mejora) en un pull request.

## Hard Rules

- Lee la issue entera, con su informe o mapa, antes de tocar código.
- Reproduce con datos inventados que sigan la forma del informe o del mapa; nunca pidas al usuario sus datos reales.
- Una rama por issue: `fix/<id-broker>-<tema>` o `feat/<id-broker>-<tema>`; commits Conventional Commits.
- No abras el PR si `npm run check`, `npm test` o `npm run scan` fallan.
- Sin permiso de escritura, trabaja en un fork (`gh repo fork --clone`).

## Decision Gates

| Issue | Acción |
| --- | --- |
| Nuevo bróker o mejora | Sigue `contribuir-broker` con el mapa como fuente |
| Fallo | Test que lo reproduzca primero, luego el arreglo |
| Falta información | Comenta en la issue qué falta (qué página explorar, qué paso repetir) y para |

## Execution Steps

1. `gh issue view <n>`; resume qué se pide y con qué evidencia.
2. Crea la rama.
3. Implementa con `contribuir-broker` y prueba con `probar-extension`; pide al usuario la prueba manual en su cuenta si hace falta.
4. `gh pr create` rellenando `.github/pull_request_template.md`, con `Cierra #<n>` y los resultados de las comprobaciones.
5. Comenta en la issue el enlace del PR.

## Output Contract

Devuelve: enlace del PR, qué cambia, resultados de `npm run check`, `npm test` y `npm run scan`, y qué no se pudo probar.

## References

- [CONTRIBUTING.md](../../../CONTRIBUTING.md) — flujo issue → PR y reglas.
- [.github/pull_request_template.md](../../../.github/pull_request_template.md) — lista de comprobación del PR.
