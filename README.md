# Extensión de Financial Hub

Lleva tu cuenta del bróker a una cartera de [Financial Hub](https://financial-hub.es) sin descargar
ficheros. La extensión lee tu cuenta a través de la propia web del bróker, **en tu pestaña con la
sesión iniciada**, y entrega el resultado a la importación de Financial Hub, donde eliges la
cartera y revisas una vista previa antes de importar nada.

| Bróker | Estado |
| --- | --- |
| MyInvestor | Disponible: órdenes (fondos, acciones y ETF), ejecuciones y movimientos de efectivo |

¿Quieres otro bróker? Mira [CONTRIBUTING.md](CONTRIBUTING.md): cada bróker es un adaptador pequeño.

## Instalación (modo desarrollador)

La extensión aún no está en la Chrome Web Store. Instálala tú:

1. Descarga este repositorio (`git clone` o **Code → Download ZIP** y descomprímelo).
2. Abre `chrome://extensions`, activa **Modo de desarrollador** (arriba a la derecha), pulsa
   **Cargar descomprimida** y elige la carpeta del repositorio.
3. Fija la extensión en la barra.

Funciona en Chrome y en otros navegadores Chromium (Edge, Brave) desde la versión 111.

## Uso

1. Abre la web de tu bróker e inicia sesión. La contraseña la escribes tú; la extensión nunca.
2. Pulsa la extensión → **Sincronizar con Financial Hub**.
   - **Últimos 90 días** (por defecto) es la actualización normal y no pide nada más.
   - **Desde una fecha** anterior: MyInvestor te pide aprobar la solicitud en su app del móvil
     (una norma europea de servicios de pago). Deja el popup abierto hasta que termine.
3. Financial Hub se abre en la importación con tu cuenta como un fichero más. Elige la cartera
   (la tuya de siempre para actualizarla) y revisa la vista previa. Solo se añaden los movimientos
   que la cartera aún no tiene.

## Privacidad

En corto: tu contraseña y tu sesión del bróker nunca salen de la web del bróker; la extensión solo
envía las órdenes y movimientos que Financial Hub necesita, a Financial Hub y solo cuando pulsas.
Detalle en [PRIVACY.md](PRIVACY.md).

## Licencia

[MIT](LICENSE).
