# Contributing: add a broker, test it, fix it

The extension is a set of small **broker adapters** around a shared core. An adapter reads the
account from the broker's own web app, in the user's signed-in tab, and returns a **bundle**: a
JSON document with the orders and cash movements Financial Hub needs. The core validates the
bundle and hands it to Financial Hub, or saves it locally while you develop.

You can build and test an adapter end to end on your own account without any Financial Hub
backend: the popup's **Descargar el paquete** button and `npm run validate` are all you need.
Importing a new broker's bundle into Financial Hub also needs the Financial Hub team to accept the
format on their side; see [Get it into Financial Hub](#get-it-into-financial-hub).

## How it fits together

```text
broker tab (your session)                 extension                         Financial Hub tab
┌──────────────────────────┐   collect   ┌──────────────────────┐  deliver  ┌──────────────────────┐
│ src/brokers/<id>/        │ ◀────────── │ src/popup.js         │ ────────▶ │ src/financial-hub.js │
│   hook.js    (optional)  │ ──bundle──▶ │   validate.js        │  session  │  posts the bundle to │
│   content.js (adapter)   │             │ src/background.js    │  storage  │  the import page     │
└──────────────────────────┘             └──────────────────────┘           └──────────────────────┘
```

- `src/brokers.js`: the registry. One entry per broker: id, name, the pages it runs on, the
  bundle format, whether Financial Hub can import it yet.
- `src/brokers/<id>/content.js`: the adapter. A content script on the broker's pages that answers
  the popup's `collect` message with a bundle.
- `src/brokers/<id>/hook.js` (optional): a script in the page's own world, for values the page
  only keeps in memory (MyInvestor: its device id header). Keep it tiny and never read secrets.
- `src/validate.js`: the bundle checks (shared envelope, the broker's shape, no credentials).
- `src/popup.js`, `src/background.js`, `src/financial-hub.js`: the shared core; you should not
  need to change them for a new broker.
- `docs/bundle-format.md`: the bundle formats.

## Add a broker, step by step

1. **Map the broker's web app.** Sign in to the broker in Chrome, open DevTools → **Network**, filter
   by `Fetch/XHR`, and click through the pages that show your orders, executions and cash
   movements. Note for each: the URL, the parameters (dates, account ids, paging), the
   response fields, and how the page authenticates (a bearer token in `localStorage`, a cookie,
   a header). Look for:
   - every order with its **execution** (date, quantity, price or net amount, fees, currency);
   - every **cash movement** with its date, type, description, signed amount and, if possible,
     the running balance;
   - a stable **reference** per order and movement (it lets Financial Hub avoid duplicates);
   - limits: date ranges, paging, extra confirmations (MyInvestor asks for an in-app approval
     beyond 90 days).
2. **Write down the bundle format** in `docs/bundle-format.md`: a `format` name
   (`financial-hub/<broker>-api`), `version: 1`, and the fields you will send. Send only what
   Financial Hub needs (see [Rules](#rules)).
3. **Register the broker** in `src/brokers.js` with `supported: false` until Financial Hub accepts
   the format. The popup then offers only **Descargar el paquete** for it.
4. **Add the adapter** at `src/brokers/<id>/content.js`, starting from the MyInvestor one:
   - answer `chrome.runtime.onMessage` `{ type: 'collect', from? }` with
     `{ ok: true, bundle: <JSON string> }` or `{ ok: false, error: <message for the user> }`, and
     return `true` from the listener (the answer is asynchronous);
   - report progress with `chrome.runtime.sendMessage({ type: 'progress', line })`;
   - call the broker's API with `fetch` from the content script: it runs with the page's origin,
     so the broker's own CORS rules apply and the session cookies or token the page uses work;
   - build the bundle with an explicit field list per object (`pick` in the MyInvestor adapter),
     never by spreading the API's response.
5. **Wire it in `manifest.json`**: a `content_scripts` entry matching the broker's pages (and the
   optional `hook.js` with `"world": "MAIN"`, `"run_at": "document_start"`), and
   `host_permissions` for the pages and the API host.
6. **Add its shape check** to `SHAPES` in `src/validate.js` and a test in `test/` with a
   synthetic bundle (made-up values, never your real data).
7. Run `npm run check` and `npm test`, then test on your account (next section).

## Test it

No build step and no dependencies: Node 20+ for the checks, Chrome for the rest.

```bash
npm run check   # every script parses, the manifest's files exist, each broker is wired
npm test        # bundle validation and broker registry
```

On your own account:

1. `chrome://extensions` → **Load unpacked** (first time) or the **reload** icon on the extension
   card after each change. Reload the broker tab too, so the new content script is injected.
2. Open the broker, sign in, click the extension → **Descargar el paquete (pruebas)**.
3. Check the file: `npm run validate -- ~/Downloads/<id>-bundle-<date>.json`.
4. Open it and compare a few orders and movements with what the broker shows: dates, quantities,
   amounts, signs, currency.
5. For a supported broker, also try **Sincronizar con Financial Hub** and read the import preview:
   *Nuevos*, *Ya importados*, *Bloqueados* and the cash balance against the broker.

To test against a local Financial Hub, point the extension to it from the service worker
console (`chrome://extensions` → the extension → **Inspect views: service worker**):

```js
chrome.storage.local.set({ origin: 'http://localhost:3000' }); // back: chrome.storage.local.remove('origin')
```

## Fix what goes wrong

Where to look:

- **Adapter errors**: the broker tab's DevTools console (content scripts log there) and its
  **Network** tab for the API calls and their status codes.
- **Popup errors**: right-click the popup → **Inspect**.
- **Service worker** (handing the bundle to Financial Hub): `chrome://extensions` → **Inspect views:
  service worker**.
- **Financial Hub side**: the import page's console; the preview lists what was read, what is new
  and what blocks.

Common problems:

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Abre esta ventana desde la web de tu bróker…" | The active tab is not a page of a registered broker | Open the broker's web app; check `pages` in `src/brokers.js` |
| "Could not establish connection. Receiving end does not exist." | The content script is not in that tab (installed or reloaded after the tab opened) | Reload the broker tab |
| "La sesión … ha caducado" / HTTP 401 | The broker's token expired | Reload the broker page (it refreshes the session) and retry |
| HTTP 202 instead of data (MyInvestor) | The range needs the in-app approval | Approve the request in the broker's mobile app; keep the popup open |
| Nothing arrives at the phone (MyInvestor) | The signature request was created but not sent | Browse the broker a moment so `hook.js` learns the device id, then retry |
| "El paquete no es válido: …" | The adapter built a wrong shape or included a forbidden key | Fix the adapter; `npm run validate` on the downloaded file shows every problem |
| CORS error in the console | The API refuses requests from the page's origin | Call the API the web app itself calls, from the content script, not from the service worker |
| Financial Hub opens but no file appears | The import page is on another origin than the configured one, or not on the broker's upload step | Check `origin` in the service worker storage; open the broker's import from the start |
| The popup closed and the sync stopped | Chrome closes popups when they lose focus | Keep the popup open until it finishes (a known limitation) |

When you report a bug, include the extension version, the broker, the step, the console error
and the HTTP status. Never paste a real bundle, a token or a screenshot with your data.

## Get it into Financial Hub

Financial Hub has to understand a new bundle format before the **Sincronizar** button can be turned
on (`supported: true`). Open an issue or a pull request with:

- the adapter and its entry in `src/brokers.js` (`supported: false`);
- the format in `docs/bundle-format.md`;
- an **anonymised** sample bundle: same structure and realistic shapes, but invented values
  (names, ISINs of public instruments are fine; amounts, dates and references made up);
- what you checked on your own account (counts of orders and movements, any oddity).

The Financial Hub team adds the format on their side and turns the broker on.

## Rules

- **Never touch credentials.** Do not read, store or send passwords, PINs, one-time codes,
  session cookies or tokens. Use the session the page already has, from the page itself.
- **Send the minimum.** Only the fields Financial Hub needs; no account numbers, national ids,
  addresses or anything that identifies the holder.
- **Only on click.** No background polling, no scheduled syncs, no analytics, no remote code.
- **Narrow permissions.** Match only the broker's own pages and API host.
- **No real data in the repository.** Tests and samples use invented values.
