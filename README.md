# Extensión de Financial Hub

Lleva tu cuenta del bróker a una cartera de [Financial Hub](https://financial-hub.es) sin descargar
ficheros. La extensión lee tu cuenta a través de la propia web del bróker, **en tu pestaña con la
sesión iniciada**, y entrega el resultado a la importación de Financial Hub, donde eliges la cartera
y revisas una vista previa antes de importar nada.

## Brókers

| Bróker | Estado | Guía |
| --- | --- | --- |
| MyInvestor | Disponible (fondos, acciones, ETF y efectivo) | [docs/brokers/myinvestor.md](docs/brokers/myinvestor.md) |

Brókers que nos gustaría tener y para los que buscamos ayuda: **DEGIRO**, **Interactive Brokers**,
**MEXEM**, **Renta 4**, **XTB**, **Trade Republic**, **Freedom24**, **eToro**, **Scalable
Capital**, **Trading 212**, **Revolut**, **Openbank**, **ING**, **Bankinter** y **Selfbank**.
¿Usas alguno? Mira [Colaborar](#colaborar): no hace falta saber programar.

## Instalación

### Con tu agente (Claude Code, Codex…)

Abre tu agente en una carpeta vacía y pégale:

> Clona https://github.com/Financial-Hub-Project/financial-hub-extension y sigue su `AGENTS.md`
> para instalar la extensión en mi Chrome.

El agente descarga el repositorio, comprueba que todo funciona y te guía en los dos clics que
Chrome exige hacer a mano.

### A mano

1. Descarga este repositorio (`git clone` o **Code → Download ZIP** y descomprímelo).
2. Abre `chrome://extensions`, activa **Modo de desarrollador** (arriba a la derecha), pulsa
   **Cargar descomprimida** y elige la carpeta del repositorio.
3. Fija la extensión en la barra.

Funciona en Chrome y en otros navegadores Chromium (Edge, Brave) desde la versión 111. Después,
sigue la guía de tu bróker en la tabla de arriba.

## Colaborar

Todo se puede hacer pidiéndoselo a tu agente, que sigue las skills de este repositorio:

| Quieres… | Dile a tu agente |
| --- | --- |
| Proponer un bróker nuevo | «Sigue AGENTS.md para proponer el bróker Trade Republic» |
| Ampliar un bróker (planes de pensiones, carteras gestionadas…) | «Sigue AGENTS.md para añadir los planes de pensiones de MyInvestor» |
| Reportar un fallo | «Sigue AGENTS.md para reportar este fallo» |
| Arreglar una issue | «Sigue AGENTS.md para resolver la issue #12» |

Sin agente, la extensión tiene dos herramientas que generan lo que hace falta **sin ningún dato
tuyo**: **Explorar** (un mapa de la API del bróker para proponerlo o ampliarlo) y **Copiar informe
para una issue** (cuando algo falla). El flujo completo está en [CONTRIBUTING.md](CONTRIBUTING.md).

## Privacidad

Tu contraseña y tu sesión del bróker nunca salen de la web del bróker; la extensión solo envía las
órdenes y movimientos que Financial Hub necesita, a Financial Hub y solo cuando pulsas. Los mapas e
informes para colaborar no contienen valores. Detalle en [PRIVACY.md](PRIVACY.md).

## Licencia

[MIT](LICENSE).
