# MyInvestor

| | |
| --- | --- |
| Estado | Disponible |
| Web | `https://newapp.myinvestor.es` |
| API | `https://api.myinvestor.es` (la misma que usa la web) |
| Adaptador | `src/brokers/myinvestor/` |
| Formato | `financial-hub/myinvestor-api`, versión 1 ([formato](../formato-del-paquete.md)) |
| Importación en Financial Hub | Importar → MyInvestor (la misma que los ficheros de Inversis) |

## Uso

1. Abre `newapp.myinvestor.es` e inicia sesión (la contraseña la escribes tú).
2. Pulsa la extensión → **Sincronizar con Financial Hub**:
   - **Últimos 90 días** (por defecto): la actualización normal, sin pasos extra.
   - **Desde una fecha** anterior a 90 días: MyInvestor manda una solicitud de firma a la app de tu
     móvil (norma europea PSD2). Apruébala y deja el popup abierto hasta que termine.
3. En Financial Hub elige tu cartera de MyInvestor (o una nueva) y revisa la vista previa. Solo se
   añade lo que la cartera aún no tiene, aunque la importaras antes con los ficheros de Inversis.

## Qué lee

- Órdenes de fondos y su ejecución real (número de operación, día del valor liquidativo,
  participaciones, importe ejecutado, comisiones).
- Órdenes de acciones y ETF y su ejecución (fecha, liquidación, títulos, importe neto en la divisa
  del valor y en euros).
- Movimientos de cada cuenta de efectivo con su saldo acumulado.

## Pendiente (se buscan colaboradores)

- [ ] **Carteras gestionadas (roboadvisor):** carteras indexadas, cartera metal, cartera red y el
      resto. Tienen su propia cuenta de efectivo; no se han probado.
- [ ] **Planes de pensiones:** aportaciones, traspasos entre planes y posiciones.
- [ ] **Traspasos de fondos desde o hacia otra entidad:** solo se han visto traspasos internos.
- [ ] **Traspasos de acciones a otra entidad** (`TRASPASO RV LIBRE DE PAGO`): se leen, pero
      Financial Hub los bloquea para que el usuario los resuelva.
- [ ] **Operaciones corporativas:** OPA, splits y contrasplits, derechos, dividendos en acciones.
- [ ] **Dividendos en bruto:** la API solo da el neto; el bruto y la retención en origen se estiman.
- [ ] **Otros productos:** depósitos a plazo, cuenta en dólares, inversión en facturas (Sego),
      Urbanitae, capital privado y préstamos.
- [ ] **Más mercados de acciones:** hoy se reconocen NYSE (`NYS`), NASDAQ (`NDQ`), XETRA (`XTR`),
      Mercado Continuo (`BMA`) y Toronto (`TOR`); otro código bloquea la operación.

Para cualquiera de ellos: abre la parte de la web que lo muestra, pulsa la extensión → **Empezar a
explorar**, recórrela y adjunta el mapa a una issue **Mejora de un bróker**.

## Limitaciones conocidas

- Si cierras el popup mientras esperas la firma de más de 90 días, la sincronización se pierde.
- La primera vez tras instalar o recargar la extensión, recarga también la pestaña de MyInvestor.
- La firma de más de 90 días necesita que hayas navegado un momento por la web (la extensión
  aprende así el id de dispositivo que exige MyInvestor).

## Probarlo

Sigue la skill `probar-extension` o, a mano, [CONTRIBUTING.md → Probarlo](../../CONTRIBUTING.md#probarlo).
