'use strict';

const CURRENCIES = Object.freeze([
  { code: 'BRL', label: 'Real brasileiro', symbol: 'R$', decimals: 2 },
  { code: 'EUR', label: 'Euro', symbol: '€', decimals: 2 },
  { code: 'USD', label: 'US Dollar', symbol: '$', decimals: 2 }
]);

const _byCode = new Map(CURRENCIES.map((c) => [c.code, c]));

function getCurrency(code) {
  return _byCode.get(String(code || '').trim().toUpperCase()) || _byCode.get('BRL');
}

function listCurrencies() {
  return CURRENCIES.map((c) => ({ ...c }));
}

module.exports = { CURRENCIES, getCurrency, listCurrencies };
