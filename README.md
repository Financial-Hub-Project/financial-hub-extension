# Financial Hub browser extension

Brings your broker account into a [Financial Hub](https://financial-hub.es) portfolio without
downloading statement files. The extension reads your account through the broker's own web
app, **in your own signed-in tab**, and hands the result to Financial Hub's import, where you pick
the portfolio and review a preview before anything is imported.

| Broker | Status |
| --- | --- |
| MyInvestor | Supported: orders (funds, stocks and ETFs), executions and cash movements |

Want another broker? See [CONTRIBUTING.md](CONTRIBUTING.md): each broker is a small adapter.

## Install (developer mode)

The extension is not in the Chrome Web Store yet. Load it yourself:

1. Download this repository (`git clone` or **Code → Download ZIP** and unzip it).
2. Open `chrome://extensions`, turn on **Developer mode** (top right), click **Load unpacked** and
   pick the repository folder.
3. Pin the extension to the toolbar.

Works in Chrome and other Chromium browsers (Edge, Brave) version 111 or later.

## Use

1. Open your broker's web app and sign in. You type your password; the extension never does.
2. Click the extension → **Sincronizar con Financial Hub**.
   - **Últimos 90 días** (default) is the regular update and needs nothing else.
   - **Desde una fecha** further back: MyInvestor asks you to approve the request in its mobile
     app (a European payment-services rule). Keep the popup open until it finishes.
3. Financial Hub opens on the import with your account as one more file. Pick the portfolio
   (your existing one to update it) and review the preview. Only movements the portfolio does not
   have yet are added.

## Privacy

Short version: your password and your broker session never leave the broker's page; the
extension only sends the orders and movements Financial Hub needs, to Financial Hub, and only
when you click. Details in [PRIVACY.md](PRIVACY.md).

## License

[MIT](LICENSE).
