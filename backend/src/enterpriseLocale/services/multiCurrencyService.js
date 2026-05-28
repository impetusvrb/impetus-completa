'use strict';

const currencyCatalog = require('../catalog/currencyCatalog');
const localeCatalog = require('../catalog/localeCatalog');

function _loadRates() {
  try {
    const raw = process.env.IMPETUS_FX_RATES_JSON;
    if (!raw) {
      return { BRL: 1, EUR: 0.18, USD: 0.19 };
    }
    const o = JSON.parse(raw);
    return typeof o === 'object' && o ? o : { BRL: 1 };
  } catch (_e) {
    return { BRL: 1, EUR: 0.18, USD: 0.19 };
  }
}

function convertAmount(amount, fromCurrency, toCurrency) {
  const rates = _loadRates();
  const from = String(fromCurrency || 'BRL').toUpperCase();
  const to = String(toCurrency || 'BRL').toUpperCase();
  const n = Number(amount);
  if (!Number.isFinite(n)) return { ok: false, error: 'invalid_amount' };
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  const inBase = n / fromRate;
  const converted = inBase * toRate;
  return {
    ok: true,
    amount: n,
    from,
    to,
    converted: Math.round(converted * 100) / 100,
    rates_source: 'env_static_advisory'
  };
}

function formatMoney(amount, currencyCode, locale) {
  const cur = currencyCatalog.getCurrency(currencyCode);
  const loc = localeCatalog.normalizeLocale(locale);
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: cur.code,
      minimumFractionDigits: cur.decimals,
      maximumFractionDigits: cur.decimals
    }).format(n);
  } catch (_e) {
    return `${cur.symbol} ${n.toFixed(cur.decimals)}`;
  }
}

module.exports = { convertAmount, formatMoney, _loadRates };
