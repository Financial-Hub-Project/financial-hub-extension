# Privacidad

Qué lee la extensión, qué envía y qué no toca nunca. Son reglas que todo adaptador debe cumplir
(ver [CONTRIBUTING.md](CONTRIBUTING.md)); el popup comprueba la última antes de enviar nada.

## Lee

Solo cuando pulsas **Sincronizar** (o **Descargar el paquete**), solo en la pestaña del bróker en la
que estás y solo con la sesión que esa página ya tiene:

- tus órdenes y sus ejecuciones (instrumento, fecha, cantidad, importes, comisiones, divisa);
- tus movimientos de efectivo del rango que elijas (fechas, tipo, descripción, importe, saldo).

## Envía

- El paquete llega a la página de importación de Financial Hub a través del navegador: se guarda
  en el almacenamiento de sesión del navegador hasta que esa página lo recoge (entonces se borra;
  también se pierde al cerrar el navegador). Financial Hub lo recibe con tu propia sesión iniciada,
  como un fichero que subes, y te enseña una vista previa que tienes que confirmar.
- **Descargar el paquete** lo guarda solo en tu ordenador. Contiene tus datos financieros: no lo
  compartas.
- No se envía nada a ningún otro servidor. La extensión no tiene analítica ni código remoto.

## Herramientas para colaborar

- **Explorar este bróker** graba, solo en la pestaña actual y solo tras pulsar el botón (permisos
  `activeTab` y `scripting`), qué llamadas hace la web: rutas con los ids sustituidos, nombres de
  parámetros y cabeceras, códigos HTTP y la forma de las respuestas (campos y tipos). Nunca guarda
  valores. Se descarga en tu ordenador y la adjuntas tú a una issue si quieres.
- **Copiar informe para una issue** copia la versión, el bróker, el paso, el mensaje de error, los
  recuentos, la estructura y las etiquetas fijas del bróker (tipo de operación, divisa…). Nunca
  importes, fechas, nombres ni referencias.

## Nunca

- Nunca lee, guarda ni envía tu contraseña, tu PIN ni códigos de un solo uso.
- Nunca envía tu sesión ni tu token del bróker a ningún sitio: se quedan en la web del bróker.
- Nunca envía más de lo que Financial Hub necesita: ni números de cuenta, ni DNI, ni dirección.
- Nunca se ejecuta por su cuenta en páginas distintas de las webs de los brókers soportados y la
  página de importación de Financial Hub (ver `manifest.json`); en cualquier otra web solo actúa
  **Explorar**, y solo en la pestaña actual cuando lo pulsas.

El popup rechaza cualquier paquete con una clave como `token`, `authorization`, `password` o
`cookie`, o con un valor que parezca un token, para que un fallo de un adaptador no pueda filtrar
una credencial.
