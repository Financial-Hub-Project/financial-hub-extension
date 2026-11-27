# Publicar en Chrome Web Store

Cómo se construye el paquete que se sube a la tienda, qué se declara en cada campo del panel de
desarrollador y cómo volver atrás. La extensión que carga un colaborador desde el repositorio
(**Cargar descomprimida**) y la de la tienda salen del mismo código; la única diferencia es que la
de la tienda no puede hablar con un Financial Hub en `localhost`.

## Construir el paquete

```sh
npm run check && npm test && npm run scan
npm run package
```

`npm run package` escribe `dist/financial-hub-extension-<versión>.zip` e imprime su SHA-256. El zip
es reproducible: el mismo commit da siempre los mismos bytes (entradas ordenadas, fecha fija y sin
compresión), así que cualquiera puede comprobar que lo publicado coincide con el código. Contiene
solo `manifest.json`, `LICENSE` y `src/`; nada de tests, documentación ni skills.

El paquete se lee del commit (`HEAD`, o el que se pase: `npm run package -- v0.1.0`), no de la
carpeta: los cambios sin commit y los ficheros sin seguimiento no entran (el script lo avisa), y el
fin de línea del checkout no cambia el resultado.

El `manifest.json` del zip es el del repositorio sin los orígenes `http://localhost/*`, que solo
sirven para probar contra un Financial Hub local (ver [CONTRIBUTING.md](../CONTRIBUTING.md)).
`npm run check` comprueba que el manifiesto cumple lo que pide la tienda (versión, longitudes,
iconos de 16, 32, 48 y 128 px) y que el paquete no alcanza `localhost`.

## Ficha de la tienda

| Campo | Valor |
| --- | --- |
| Nombre | Financial Hub (del manifiesto) |
| Resumen | La `description` del manifiesto (≤ 132 caracteres) |
| Categoría | Productividad |
| Idioma | Español |
| Sitio web | `https://financial-hub.es` |
| Política de privacidad | `https://github.com/Financial-Hub-Project/financial-hub-extension/blob/main/PRIVACY.md` |
| Visibilidad inicial | No listada (solo con el enlace) hasta la primera prueba desde la tienda |

Descripción larga sugerida:

> Lleva tu cuenta de MyInvestor a una cartera de Financial Hub sin descargar ficheros. Al pulsar
> **Sincronizar**, la extensión lee tus órdenes y movimientos de efectivo a través de la web del
> bróker, en tu pestaña y con tu sesión, y los entrega a la página de importación de Financial Hub,
> donde eliges la cartera y revisas una vista previa antes de importar nada. Tu contraseña y tu
> sesión del bróker nunca salen de la web del bróker. Sin analítica ni código remoto. Código
> abierto (MIT).
>
> Para colaboradores: **Explorar este bróker** graba, solo en la pestaña actual y solo al pulsarlo,
> la forma de las llamadas que hace una web (rutas y campos, sin valores) para proponer un bróker
> nuevo. El mapa se descarga en tu ordenador y no se envía a ningún sitio.

Recursos gráficos que se suben en el panel (no van en el zip): el icono de 128 px
(`src/icons/icon-128.png`), al menos una captura de 1280×800 o 640×400 y la miniatura promocional de
440×280. Las capturas se hacen con una cuenta de pruebas o con los datos tapados: **nunca** con
importes, nombres ni referencias reales.

## Pestaña «Prácticas de privacidad»

**Propósito único.** Sincronizar las operaciones de la cuenta de un bróker soportado con la
importación de carteras de Financial Hub, solo cuando el usuario lo pide.

**Justificación de cada permiso:**

| Permiso | Por qué hace falta |
| --- | --- |
| `storage` | Guarda en el almacenamiento de sesión el estado de una lectura en curso y el paquete validado hasta que la página de importación lo recoge; en el almacenamiento local, solo la fecha de la última entrega por bróker, para avisar de huecos. |
| `activeTab` | **Explorar este bróker** actúa solo sobre la pestaña en la que el usuario pulsa el botón, sin acceso permanente a otras webs. |
| `scripting` | Inyecta, al pulsar **Explorar**, el registrador que anota la forma de las llamadas de la web (sin valores) en esa pestaña, y lee su resultado. |
| `https://newapp.myinvestor.es/*` | La web de MyInvestor: el popup reconoce que la pestaña es del bróker y ahí corren el adaptador (que llama a la API de MyInvestor con las reglas CORS de la página, por eso la API no necesita permiso propio) y el gancho que anota dos cabeceras no secretas de la app. |
| `https://financial-hub.es/*` | La página de importación de Financial Hub, que recoge el paquete con la sesión del usuario. |

**Código remoto.** No. Todo el JavaScript va en el paquete; no hay `eval`, scripts remotos ni
analítica.

**Uso de datos.** Se marcan estas categorías, cada una con su motivo en la descripción y en
[PRIVACY.md](../PRIVACY.md), que dice lo mismo que la interfaz:

| Categoría | Qué es y adónde va |
| --- | --- |
| Información financiera y de pago | Las órdenes y movimientos de efectivo del usuario. Solo al pulsar **Sincronizar**, se entregan a la página de importación de Financial Hub (o se descargan al ordenador con **Descargar el paquete**). |
| Información de autenticación | El token de sesión que la web del bróker ya guarda. El adaptador lo usa en esa pestaña y lo manda solo a la API del propio bróker, como hace la web; nunca se guarda en la extensión ni se envía a Financial Hub. |
| Actividad del usuario (supervisión de red) | **Explorar este bróker**, solo en la pestaña donde se pulsa y hasta recargarla, anota dominios, rutas y la forma de las llamadas que hace la web, sin valores. Se queda en el ordenador; el usuario decide si la adjunta a una issue. |

No se marcan nombre, dirección, correo, ubicación, historial de navegación ni comunicaciones. Se
certifican las tres declaraciones de uso limitado (sección «Uso limitado» de PRIVACY.md).

En la descripción larga se nombra **Explorar** de forma visible (el último párrafo de la ficha de
arriba), porque Google exige describir en la ficha cualquier función que recoja actividad.

## Subir una versión

1. Sube `version` en `manifest.json` (y en `package.json`) en un PR y fusiónalo con la CI en verde.
2. Desde `main` actualizado: `npm run check && npm test && npm run scan && npm run package`. Anota el
   SHA-256 que imprime; cualquiera puede reproducirlo con el mismo commit.
3. En el [panel de desarrollador](https://chrome.google.com/webstore/devconsole), **Paquete → Subir
   un paquete nuevo** con el zip de `dist/`. La primera vez, rellena la ficha y la pestaña de
   privacidad con lo de arriba.
4. **Enviar a revisión**, con publicación manual tras la aprobación (opción «aplazar la
   publicación»), para publicar cuando convenga.
5. Etiqueta el commit publicado: `git tag v<versión> && git push origin v<versión>`.
6. Tras publicarse, instala la versión de la tienda en un perfil limpio de Chrome y comprueba
   **Sincronizar** con una cuenta real sin confirmar la importación en una cartera que no sea de
   pruebas.

## Volver atrás

- **Antes de publicarse**: en el panel, **Cancelar revisión** o, si ya está aprobada y aplazada, no
  la publiques; la versión anterior sigue siendo la que reciben los usuarios.
- **Ya publicada**: Chrome Web Store no deja bajar el número de versión. Revierte el cambio en
  `main`, sube `version` (por ejemplo, de `0.2.0` a `0.2.1`) con el código anterior, empaqueta y
  envíalo; si el fallo pone en riesgo datos, despublica la extensión desde el panel mientras tanto
  (los usuarios que ya la tienen la conservan, pero nadie nuevo la instala).
- La importación por ficheros de Financial Hub sigue funcionando sin la extensión en todos los
  casos.
