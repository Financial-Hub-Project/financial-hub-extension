---
name: probar-extension
description: "Trigger: probar extensión, testear adaptador, validar paquete, comprobar antes de PR, no funciona la sincronización. Prueba la extensión y diagnostica fallos."
license: MIT
metadata:
  author: financial-hub
  version: "1.0"
---

## Activation Contract

Cárgala antes de dar por bueno un cambio en la extensión, antes de abrir un PR y cuando una
sincronización falle.

## Hard Rules

- Ejecuta `npm run check` y `npm test` tras cualquier cambio e informa `<comando>: <resultado observado>`.
- Nunca inventes resultados: si una prueba manual no se pudo hacer, dilo.
- Nunca subas, pegues ni adjuntes un paquete real, un token o capturas con datos del usuario.
- Nunca confirmes una importación en Financial Hub salvo en una cartera de pruebas y con permiso del usuario.
- La contraseña del bróker la escribe siempre el usuario.

## Decision Gates

| Situación | Prueba |
| --- | --- |
| Cambio en núcleo o validación | `npm run check`, `npm test` |
| Cambio en un adaptador | Lo anterior + prueba manual con descarga y `npm run validate` |
| Bróker `supported: true` | Lo anterior + **Sincronizar** y lectura de la vista previa |
| Sincronización que falla | Diagnóstico con la tabla de errores de `CONTRIBUTING.md` |

## Execution Steps

1. `npm run check` y `npm test`.
2. Recarga la extensión en `chrome://extensions` y la pestaña del bróker.
3. Con sesión iniciada: popup → **Descargar el paquete (pruebas)**.
4. `npm run validate -- <fichero>`; compara órdenes y movimientos con lo que muestra el bróker (fechas, cantidades, importes, signos, divisa).
5. Si está soportado: **Sincronizar con Financial Hub** y revisa *Nuevos*, *Ya importados*, *Bloqueados* y el efectivo.
6. Si falla: consola y Red de la pestaña del bróker, inspector del popup y del service worker; aplica la tabla de errores.
7. Borra los paquetes descargados al terminar.

## Output Contract

Devuelve: cada comando con su resultado, qué prueba manual se hizo y con qué resultado (recuentos, nunca datos), problemas encontrados con su causa y arreglo, y lo que no se pudo probar.

## References

- [CONTRIBUTING.md](../../../CONTRIBUTING.md) — pruebas y tabla de errores habituales.
- [docs/formato-del-paquete.md](../../../docs/formato-del-paquete.md) — qué debe contener el paquete.
