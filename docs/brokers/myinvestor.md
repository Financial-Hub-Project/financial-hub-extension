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
2. Pulsa la extensión y elige qué quieres hacer:
   - **Actualizar una cartera** (por defecto): trae los **últimos 90 días**, sin pasos extra, a una
     cartera que ya tienes. Puedes elegir **Desde** otra fecha. Si la última entrega a Financial
     Hub desde este navegador es de hace más de 89 días, o no hay ninguna, la extensión avisa de
     que quedaría un hueco y propone leer desde esa fecha.
   - **Importar desde cero**: para una cartera nueva. Pon la fecha de apertura de tu cuenta (o una
     anterior) para no dejar nada fuera.
3. Pulsa **Sincronizar con Financial Hub**. Para más de 90 días, MyInvestor manda una solicitud de
   firma a la app de tu móvil (norma europea PSD2): abre la app y apruébala, porque MyInvestor no
   siempre te avisa. La extensión sí: un aviso grande arriba del popup, una notificación del
   sistema y la etiqueta **FIRMA** en su icono, hasta que la apruebes (tienes 5 minutos). Puedes cerrar el popup mientras
   tanto; la lectura sigue en la pestaña de MyInvestor (no la cierres ni la recargues) y, al
   reabrir el popup, ves en qué va o qué falló.
4. Se abre Financial Hub: con *Importar desde cero*, para crear la cartera nueva; con *Actualizar*,
   para elegir la que actualizas. Revisa la vista previa. Solo se añade lo que la cartera aún no
   tiene, aunque la importaras antes con los ficheros de Inversis.

## Qué lee

- Órdenes de fondos y su ejecución real (número de operación, día del valor liquidativo,
  participaciones, importe ejecutado, comisiones).
- Órdenes de acciones y ETF y su ejecución (fecha, liquidación, títulos, importe neto en la divisa
  del valor y en euros).
- Movimientos de cada cuenta de efectivo con su saldo acumulado.

Las órdenes se piden por tramos de un año y sin duplicados; los movimientos de efectivo, en una
sola petición por cuenta, así que un rango de más de 90 días pide una firma por cada cuenta de
efectivo.

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

- La primera vez tras instalar o recargar la extensión, recarga también la pestaña de MyInvestor
  (el popup te lo pide).
- La lectura vive en la pestaña de MyInvestor: si la cierras o la recargas antes de que termine,
  se interrumpe y hay que repetirla.
- El aviso de hueco solo conoce las entregas hechas desde este navegador; Financial Hub hace su
  propia comprobación al importar.
- Los rangos de varios años por tramos aún no se han comprobado con una cuenta real: qué falta
  comprobar está en [`odd/tasks/myinvestor-extension-modos.md`](../../odd/tasks/myinvestor-extension-modos.md).
- La firma de más de 90 días necesita que hayas navegado un momento por la web (la extensión
  aprende así el id de dispositivo que exige MyInvestor).

## Probarlo

Sigue la skill `probar-extension` o, a mano, [CONTRIBUTING.md → Probarlo](../../CONTRIBUTING.md#probarlo).
