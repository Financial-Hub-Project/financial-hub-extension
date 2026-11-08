// MyInvestor adapter. Runs on newapp.myinvestor.es. When the user asks (through the service
// worker), it reads the account through MyInvestor's own API with the session this page already
// holds, and sends a bundle for Financial Hub back to the service worker. The token never leaves
// this page: only the bundle (orders and cash movements) and progress lines are sent.

const API = 'https://api.myinvestor.es';
const FORMAT = 'financial-hub/myinvestor-api';
const SIGNATURE_POLL_MS = 3000;
// The popup tells the user they have 5 minutes (signaturePrompt in run.js).
const SIGNATURE_TIMEOUT_MS = 5 * 60 * 1000;
const { checkComplete, dateWindows, readPages, readWindows } = globalThis.fhLists;

function token() {
  const raw = localStorage.getItem('myinvestor-app:TOKEN');
  if (!raw) throw new Error('Inicia sesión en MyInvestor en esta pestaña y vuelve a intentarlo.');
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}

function headers(extra = {}) {
  const set = { Authorization: `Bearer ${token()}`, Accept: 'application/json', ...extra };
  const { fhDevice, fhApp } = document.documentElement.dataset;
  if (fhDevice) set['x-device-id'] = fhDevice;
  if (fhApp) set['x-myinvestor-app'] = fhApp;
  return set;
}

async function call(path, init = {}) {
  const response = await fetch(`${API}${path}`, { ...init, headers: headers(init.headers) });
  if (response.status === 401)
    throw new Error('La sesión de MyInvestor ha caducado. Recarga la página y vuelve a intentarlo.');
  let body = null;
  try {
    body = await response.json();
  } catch {
    // An empty or non-JSON body is reported by status below.
  }
  return { status: response.status, body, data: body && body.payload ? body.payload.data : body };
}

/** A path fit for an error message (it ends up in public failure reports): ids become `{id}`. */
const endpoint = (path) =>
  path
    .split('?')[0]
    .split('/')
    .map((part) => (part.length >= 6 && /\d/.test(part) ? '{id}' : part))
    .join('/');

async function get(path) {
  const { status, data } = await call(path);
  if (status !== 200) throw new Error(`MyInvestor respondió ${status} en ${endpoint(path)}`);
  return data;
}

/** Every item of a list endpoint, following its pages when the response has them (lists.js). */
const list = (path) =>
  readPages(async (page) => {
    const { status, body } = await call(page ? `${path}&${page.key}=${page.value}` : path);
    if (status !== 200) throw new Error(`MyInvestor respondió ${status} en ${endpoint(path)}`);
    return body;
  });

const day = (date) => date.toISOString().slice(0, 10);

/** Keeps only the named fields: the bundle carries what Financial Hub reads and nothing else
 * (no account numbers, no holder's id). */
const pick = (object, keys) =>
  object ? Object.fromEntries(keys.filter((key) => key in object).map((key) => [key, object[key]])) : null;
const FUND_FIELDS = ['reference', 'isin', 'fundName', 'operationType', 'status', 'shares', 'market', 'currency'];
const EXECUTION_FIELDS = ['operationNumber', 'executionDate', 'executedShares', 'netAmountFundCurrency', 'netAmountEUR'];
const STOCK_FIELDS = ['id', 'status', 'operation', 'marketId'];
const STOCK_DETAIL_FIELDS = [
  'instrumentIsin', 'instrumentName', 'instrumentCurrency', 'executionDate', 'finishDate',
  'executedShares', 'netAmountCurrency', 'netAmountEUR',
];
const FLOW_FIELDS = [
  'operationDate', 'valueDate', 'operationType', 'concept', 'amount', 'flowType', 'currency',
  'totalBalance', 'operationRef',
];

/**
 * Cash movements of one account. Within the last 90 days MyInvestor answers at once; a longer
 * range needs the user's approval in the MyInvestor app (PSD2): the request is sent to the phone,
 * approved there, and repeated with its signature id. One request covers the whole range, so a
 * long range asks for one signature per cash account. Returns the response with its body.
 */
async function flows(accountUuid, from, to, log) {
  const path = `/account/api/v3/account/${accountUuid}/flows?dateFrom=${from}&dateTo=${to}`;
  const first = await call(path);
  if (first.status === 200) return first;
  if (first.status !== 202 || !first.data?.signatureRequestId)
    throw new Error(`MyInvestor respondió ${first.status} al pedir los movimientos`);
  const id = first.data.signatureRequestId;
  if (!document.documentElement.dataset.fhDevice)
    throw new Error('Navega un momento por MyInvestor y vuelve a intentarlo (falta el dispositivo).');
  const sent = await call(`/signature/api/v3/signature/${id}?method=INAPP`, { method: 'POST' });
  if (sent.status !== 200) throw new Error('MyInvestor no pudo enviar la firma al móvil');
  // MyInvestor does not always notify the phone: the service worker tells the user to open the app.
  log('Esperando la firma en la app de MyInvestor de tu móvil…', { signature: true });
  const deadline = Date.now() + SIGNATURE_TIMEOUT_MS;
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, SIGNATURE_POLL_MS));
    const state = await call(`/signature/api/v3/signature?signatureRequestId=${id}`);
    const status = state.data?.status;
    if (status === 'COMPLETE') {
      log('Firma aprobada: leyendo los movimientos…');
      break;
    }
    if (status && /REJECT|CANCEL|EXPIRE|ERROR/i.test(status))
      throw new Error('La firma se rechazó o caducó.');
    if (Date.now() > deadline) throw new Error('No se aprobó la firma a tiempo.');
  }
  const signed = await call(path, { headers: { 'x-signature-id': id } });
  if (signed.status !== 200) throw new Error('MyInvestor no devolvió los movimientos firmados');
  return signed;
}

async function collect({ from, to }, log) {
  const securities = await get('/cperf-server/api/v2/securities-accounts/self-basic');
  const cashAccounts = await get('/cperf-server/api/v2/cash-accounts/self');
  const fundOrders = [];
  const stockOrders = [];
  const windows = dateWindows(from, to).length;
  if (windows > 1) log(`Leyendo las órdenes en ${windows} tramos de un año…`);
  for (const account of securities) {
    // Orders are asked for one year at a time and kept once each, whatever the windows return.
    const funds = await readWindows({
      from,
      to,
      key: (order) => order.reference,
      read: (start, end) =>
        list(`/cperf-server/api/v3/securities-accounts/${account.accountId}/orders?dateFrom=${start}&dateTo=${end}`),
    });
    for (const order of funds) {
      const detail =
        order.status === 'COMPLETE'
          ? await get(`/cperf-server/api/v2/securities-accounts/${account.accountId}/orders/${order.reference}`)
          : null;
      fundOrders.push({
        ...pick(order, FUND_FIELDS),
        detail: detail && {
          relatedOperations: (detail.relatedOperations ?? []).map((item) => pick(item, EXECUTION_FIELDS)),
        },
      });
    }
    const stocks = await readWindows({
      from,
      to,
      key: (order) => order.id,
      read: (start, end) =>
        list(`/broker/v2/stock-orders?stockAccountId=${account.accountId}&type=ALL&dateFrom=${start}&dateTo=${end}`),
    });
    for (const order of stocks) {
      const detail = order.status === 'COMPLETE' ? await get(`/broker/v2/stock-orders/${order.id}`) : null;
      stockOrders.push({ ...pick(order, STOCK_FIELDS), detail: pick(detail, STOCK_DETAIL_FIELDS) });
    }
  }
  log(`${fundOrders.length} órdenes de fondos y ${stockOrders.length} de acciones leídas.`);
  const cash = [];
  for (const account of cashAccounts) {
    const { body, data } = await flows(account.accountUuid, from, to, log);
    const flowList = data?.flowList ?? [];
    checkComplete(body, flowList.length);
    cash.push({ currency: account.currency, flows: flowList.map((flow) => pick(flow, FLOW_FIELDS)) });
  }
  log(`${cash.reduce((sum, account) => sum + account.flows.length, 0)} movimientos de efectivo leídos.`);
  return {
    format: FORMAT,
    version: 1,
    capturedAt: new Date().toISOString(),
    range: { from, to },
    fundOrders,
    stockOrders,
    cash,
  };
}

/** The read in progress in this tab, if any: there is only ever one. */
let current = null;
const isDay = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Sends the result to the service worker, which wakes up for it even if Chrome had stopped it
 * while the user approved the signature. The popup may be closed by then. */
async function send(result) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await chrome.runtime.sendMessage(result);
    } catch (error) {
      if (attempt === 3) return console.error('Financial Hub: the result of the read could not be sent', error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// The service worker asks for a read with `collect` and gets an answer at once; the result comes
// later as a `collected` message. `collect-status` tells whether that read is still going on here.
chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.type === 'collect-status') {
    reply({ runId: current });
    return false;
  }
  if (message?.type !== 'collect' || typeof message.runId !== 'string') return false;
  if (current) {
    reply({ ok: false, busy: true });
    return false;
  }
  const { runId } = message;
  current = runId;
  reply({ ok: true });
  const lines = [];
  const log = (line, { signature = false } = {}) => {
    lines.push(line);
    chrome.runtime.sendMessage({ type: 'progress', runId, line, signature }).catch(() => {});
  };
  const to = isDay(message.to) ? message.to : day(new Date());
  const from = isDay(message.from) ? message.from : day(new Date(Date.now() - 89 * 86_400_000));
  collect({ from, to }, log)
    .then((bundle) => ({ type: 'collected', runId, ok: true, bundle: JSON.stringify(bundle), lines }))
    .catch((error) => ({ type: 'collected', runId, ok: false, error: String(error.message ?? error), lines }))
    // The read counts as going on until the service worker has the result.
    .then(send)
    .finally(() => {
      current = null;
    });
  return false;
});
