# Instrucciones para agentes

Extensión de navegador (Manifest V3, JavaScript sin dependencias) que lee una cuenta de bróker en
la sesión del usuario y la entrega a la importación de Financial Hub.

- Antes de crear o cambiar un adaptador de bróker, carga la skill `.claude/skills/contribuir-broker`.
- Antes de dar por bueno un cambio, abrir un PR o diagnosticar una sincronización, carga
  `.claude/skills/probar-extension`.
- Las reglas de privacidad de [PRIVACY.md](PRIVACY.md) y de [CONTRIBUTING.md](CONTRIBUTING.md#reglas)
  son obligatorias: nunca credenciales, solo los campos necesarios, solo al pulsar el usuario.
- Comprobaciones: `npm run check` y `npm test`.
- Responde al usuario y escribe la documentación en español; el código y sus comentarios, en inglés.
