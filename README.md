# Extensión de Financial Hub

Lleva tu cuenta del bróker a una cartera de [Financial Hub](https://financial-hub.es) sin descargar
ficheros. La extensión lee tu cuenta a través de la propia web del bróker, **en tu pestaña con la
sesión iniciada**, y entrega el resultado a la importación de Financial Hub, donde eliges la
cartera y revisas una vista previa antes de importar nada.

| Bróker | Estado |
| --- | --- |
| MyInvestor | Disponible: órdenes (fondos, acciones y ETF), ejecuciones y movimientos de efectivo |

¿Quieres otro bróker? Mira [CONTRIBUTING.md](CONTRIBUTING.md): cada bróker es un adaptador pequeño.

## Se buscan colaboradores

La extensión funciona con cuentas de MyInvestor de fondos, acciones y ETF, pero queda mucho por
cubrir. Si tienes alguno de estos casos en tu cuenta, tu ayuda vale oro: abre una issue o un pull
request siguiendo [CONTRIBUTING.md](CONTRIBUTING.md).

### Pendiente en MyInvestor

- [ ] **Carteras gestionadas (roboadvisor):** carteras indexadas, cartera metal, cartera red y el
      resto de carteras gestionadas. Tienen su propia cuenta de efectivo y no las hemos probado.
- [ ] **Planes de pensiones:** aportaciones, traspasos entre planes y posiciones.
- [ ] **Traspasos de fondos desde o hacia otra entidad:** solo hemos visto traspasos internos.
- [ ] **Traspasos de acciones a otra entidad** (`TRASPASO RV LIBRE DE PAGO`): hoy se leen pero
      quedan bloqueados en Financial Hub para que el usuario los resuelva.
- [ ] **Operaciones corporativas:** OPA, splits y contrasplits, derechos de suscripción, dividendos
      en acciones (los eventos con elección del titular se ven en la API, pero no se importan).
- [ ] **Dividendos en bruto:** la API solo da el importe neto; el bruto y la retención en origen
      se estiman.
- [ ] **Otros productos:** depósitos a plazo, cuenta en dólares, inversión en facturas (Sego),
      Urbanitae, capital privado y préstamos.
- [ ] **Más mercados de acciones:** hoy se reconocen NYSE, NASDAQ, XETRA, Mercado Continuo y
      Toronto; cualquier otro código de mercado bloquea la operación.
- [ ] **Firma de más de 90 días:** si se cierra el popup mientras se espera la aprobación en el
      móvil, la sincronización se pierde.

### Brókers que nos gustaría tener

Cada uno necesita su adaptador. Si usas alguno, puedes empezar con **Descargar el paquete**
sin depender de nadie:

| Bróker | Notas |
| --- | --- |
| DEGIRO | Financial Hub ya importa sus ficheros; la extensión ahorraría descargarlos |
| Interactive Brokers | Financial Hub ya importa sus extractos Flex |
| MEXEM | Financial Hub ya importa sus extractos Flex |
| Renta 4 | |
| XTB | |
| Trade Republic | La mayoría de usuarios usa solo el móvil: hace falta su web |
| Freedom24 | |
| eToro | |
| Indexa Capital | |
| Scalable Capital | |
| Trading 212 | |
| Revolut | |
| Openbank, ING, Bankinter, Selfbank | Bancos con bróker y fondos |
| Lightyear | |

¿Echas de menos alguno? Abre una issue con el nombre y qué productos tienes en él.

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
