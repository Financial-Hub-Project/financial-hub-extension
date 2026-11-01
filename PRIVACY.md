# Privacy

What the extension reads, sends and never touches. These are rules every adapter must follow
(see [CONTRIBUTING.md](CONTRIBUTING.md)); the popup enforces the last one before anything is sent.

## Reads

Only when you click **Sincronizar** (or **Descargar el paquete**), only in the broker tab you are
on, and only with the session that page already has:

- your orders and their executions (instrument, date, quantity, amounts, fees, currency);
- your cash movements for the range you chose (dates, type, description, amount, balance).

## Sends

- The bundle goes to Financial Hub's import page through the browser: it is kept in the browser's
  session storage until that page takes it (then deleted; it is also lost when the browser
  closes). Financial Hub receives it through your own signed-in session, like a file you upload,
  and shows a preview you must confirm.
- **Descargar el paquete** saves the bundle on your computer only. It contains your financial
  data: do not share it without anonymising it first.
- Nothing is sent to any other server. The extension has no analytics and no remote code.

## Never

- Never reads, stores or sends your password, PIN or one-time codes.
- Never sends your broker session or token anywhere: it stays in the broker's page.
- Never sends more than Financial Hub needs: no account numbers, no national id, no address.
- Never runs on pages other than the supported brokers' web apps and Financial Hub's import page
  (see `manifest.json`).

The popup refuses any bundle with a key such as `token`, `authorization`, `password` or `cookie`,
or a value that looks like a bearer token, so an adapter bug cannot leak a credential.
