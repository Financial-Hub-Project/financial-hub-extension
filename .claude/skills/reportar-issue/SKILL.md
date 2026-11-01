---
name: reportar-issue
description: "Trigger: reportar fallo, no funciona, error al sincronizar, abrir issue. Crea una issue de fallo con el informe de la extensión y sin datos del usuario."
license: MIT
metadata:
  author: financial-hub
  version: "1.0"
---

## Activation Contract

Cárgala cuando algo falle al sincronizar, descargar, explorar o en la vista previa de Financial Hub.

## Hard Rules

- El informe sale del botón **Copiar informe para una issue** del popup (`failureReport` de `src/report.js`); nunca construyas uno con valores.
- Nunca pegues paquetes, importes, fechas, nombres, números de cuenta, tokens ni capturas con datos.
- Revisa el texto final de la issue antes de crearla; si aparece un valor del usuario, quítalo.
- Busca antes issues parecidas (`gh issue list --search`) y comenta en la existente si la hay.

## Decision Gates

| Situación | Acción |
| --- | --- |
| El popup ofrece el informe | Pide al usuario que lo copie y te lo pegue |
| Falla antes de la extensión (no aparece el icono, no carga) | Describe el paso y la versión de Chrome; sin informe |
| El fallo es de la vista previa en Financial Hub | Indica qué esperaba y qué mostró en recuentos (*Nuevos*, *Bloqueados*), sin importes |

## Execution Steps

1. Reproduce con el usuario y anota paso, bróker y mensaje de error.
2. Consigue el informe del popup.
3. Busca duplicados.
4. `gh issue create --template fallo.yml` con el informe en un bloque `json` y lo esperado frente a lo ocurrido.
5. Ofrece seguir con `resolver-issue` si el usuario quiere arreglarlo.

## Output Contract

Devuelve: enlace de la issue (o de la existente), resumen del fallo y qué dato faltaría para reproducirlo.

## References

- [src/report.js](../../../src/report.js) — qué contiene el informe.
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) — tabla de errores habituales.
