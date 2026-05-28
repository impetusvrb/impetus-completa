'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const _als = new AsyncLocalStorage();

function runWithTenant(companyId, fn) {
  return _als.run({ companyId: companyId ? String(companyId) : null }, fn);
}

function getTenantContext() {
  return _als.getStore() || null;
}

function setRequestTenant(companyId) {
  const store = _als.getStore();
  if (store) {
    store.companyId = companyId ? String(companyId) : null;
    return;
  }
  _als.enterWith({ companyId: companyId ? String(companyId) : null });
}

module.exports = {
  runWithTenant,
  getTenantContext,
  setRequestTenant,
};
