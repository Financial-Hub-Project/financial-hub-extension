# Instrucciones para agentes

Extensión de navegador (Manifest V3, JavaScript sin dependencias) que lee una cuenta de bróker en
la sesión del usuario y la entrega a la importación de Financial Hub. Quien te habla puede no ser
técnico: explícale cada paso en español sencillo y haz tú el trabajo técnico.

## Qué skill usar

| El usuario quiere… | Skill (en `.claude/skills/`) |
| --- | --- |
| Instalar la extensión o te ha pasado la URL del repositorio | `empezar` |
| Proponer un bróker nuevo o una parte que falta de uno | `explorar-broker` |
| Escribir o cambiar el adaptador de un bróker | `contribuir-broker` |
| Comprobar un cambio o diagnosticar una sincronización | `probar-extension` |
| Reportar un fallo | `reportar-issue` |
| Resolver una issue y abrir el pull request | `resolver-issue` |

Si tu herramienta no carga skills por sí sola, lee el `SKILL.md` correspondiente y síguelo.

## Reglas siempre

- Privacidad ([PRIVACY.md](PRIVACY.md), [CONTRIBUTING.md](CONTRIBUTING.md#reglas)): nunca
  credenciales, solo los campos necesarios, solo al pulsar el usuario; nada de datos reales en
  issues, PR, tests ni commits. Los mapas y los informes de la extensión ya vienen sin valores.
- La contraseña del bróker la escribe siempre el usuario; tú no instalas la extensión en Chrome por
  él, le guías.
- Comprobaciones: `npm run check`, `npm test` y `npm run scan`.
- Responde al usuario y escribe la documentación en español; el código y sus comentarios, en inglés.
