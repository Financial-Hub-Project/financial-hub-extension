// Checks a bundle before it leaves the popup (and from the command line while developing an
// adapter): the shared envelope, the broker's own shape, and that no credential travels in it.

import { BROKERS } from './brokers.js';

/** Keys a bundle must never carry, at any depth. */
const FORBIDDEN_KEYS = /^(?:token|accesstoken|refreshtoken|authorization|password|pass|pin|otp|secret|cookie|session)$/i;
/** Values that look like a bearer token or a JWT. */
const FORBIDDEN_VALUES = [/^Bearer\s/i, /^eyJ[\w-]{10,}\.[\w-]{10,}\./];
const MAX_BYTES = 4 * 1024 * 1024;

function credentials(value, path, problems) {
  if (typeof value === 'string') {
    if (FORBIDDEN_VALUES.some((pattern) => pattern.test(value)))
      problems.push(`${path} looks like a credential`);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.test(key)) problems.push(`${path}.${key} is a forbidden key`);
    credentials(child, `${path}.${key}`, problems);
  }
}

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
const isNumber = (value) =>
  (typeof value === 'number' && Number.isFinite(value)) ||
  (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value));

/** MyInvestor version 1: what Financial Hub's decoder reads (docs/formato-del-paquete.md). */
function myinvestor(bundle, problems) {
  for (const key of ['fundOrders', 'stockOrders', 'cash'])
    if (!Array.isArray(bundle[key])) problems.push(`${key} must be an array`);
  for (const [index, order] of (bundle.fundOrders ?? []).entries()) {
    const at = `fundOrders[${index}]`;
    for (const key of ['isin', 'fundName', 'operationType', 'status', 'currency'])
      if (typeof order?.[key] !== 'string') problems.push(`${at}.${key} must be a string`);
    if (!isNumber(order?.shares)) problems.push(`${at}.shares must be a number`);
    if (order?.status === 'COMPLETE') {
      const execution = order.detail?.relatedOperations?.[0];
      if (!execution) problems.push(`${at} is complete but has no detail.relatedOperations[0]`);
      else {
        if (!isDate(execution.executionDate)) problems.push(`${at} execution has no executionDate`);
        if (!isNumber(execution.netAmountFundCurrency))
          problems.push(`${at} execution has no netAmountFundCurrency`);
      }
    }
  }
  for (const [index, order] of (bundle.stockOrders ?? []).entries()) {
    const at = `stockOrders[${index}]`;
    for (const key of ['status', 'operation'])
      if (typeof order?.[key] !== 'string') problems.push(`${at}.${key} must be a string`);
    if (order?.status === 'COMPLETE') {
      const detail = order.detail ?? {};
      for (const key of ['instrumentIsin', 'instrumentName', 'instrumentCurrency'])
        if (typeof detail[key] !== 'string') problems.push(`${at}.detail.${key} must be a string`);
      for (const key of ['executionDate', 'finishDate'])
        if (!isDate(detail[key])) problems.push(`${at}.detail.${key} must be a date`);
      for (const key of ['executedShares', 'netAmountCurrency', 'netAmountEUR'])
        if (!isNumber(detail[key])) problems.push(`${at}.detail.${key} must be a number`);
    }
  }
  for (const [index, account] of (bundle.cash ?? []).entries()) {
    const at = `cash[${index}]`;
    if (!/^[A-Z]{3}$/.test(account?.currency ?? '')) problems.push(`${at}.currency must be an ISO code`);
    if (!Array.isArray(account?.flows)) {
      problems.push(`${at}.flows must be an array`);
      continue;
    }
    for (const [row, flow] of account.flows.entries()) {
      const where = `${at}.flows[${row}]`;
      if (!isDate(flow?.operationDate) || !isDate(flow?.valueDate))
        problems.push(`${where} needs operationDate and valueDate`);
      if (!isNumber(flow?.amount)) problems.push(`${where}.amount must be a number`);
      if (flow?.flowType !== 'IN' && flow?.flowType !== 'OUT')
        problems.push(`${where}.flowType must be IN or OUT`);
      if (typeof flow?.operationType !== 'string') problems.push(`${where}.operationType must be a string`);
    }
  }
}

/** Shape checks per bundle format; a new broker adds its own. */
const SHAPES = { 'financial-hub/myinvestor-api': myinvestor };

/** Problems found in a bundle (a JSON string); an empty list means it can be sent. */
export function validateBundle(text) {
  const problems = [];
  if (new TextEncoder().encode(text).byteLength > MAX_BYTES)
    return [`bundle is larger than ${MAX_BYTES} bytes`];
  let bundle;
  try {
    bundle = JSON.parse(text);
  } catch {
    return ['bundle is not valid JSON'];
  }
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)) return ['bundle must be an object'];
  const broker = BROKERS.find((item) => item.bundleFormat === bundle.format);
  if (!broker) problems.push(`unknown format ${JSON.stringify(bundle.format)}`);
  if (bundle.version !== 1) problems.push('version must be 1');
  if (!isDate(bundle.capturedAt)) problems.push('capturedAt must be an ISO timestamp');
  credentials(bundle, 'bundle', problems);
  if (broker) SHAPES[broker.bundleFormat]?.(bundle, problems);
  return problems;
}
