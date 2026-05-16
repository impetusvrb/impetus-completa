'use strict';

/**
 * Estado de rollout em memória (processo). Aditivo; não substitui persistência enterprise futura.
 * LRU simples para evitar crescimento ilimitado.
 */

const MAX_TENANTS = 500;
const _order = [];
const _data = new Map();

function _touch(key) {
  const i = _order.indexOf(key);
  if (i >= 0) _order.splice(i, 1);
  _order.push(key);
  while (_order.length > MAX_TENANTS) {
    const drop = _order.shift();
    _data.delete(drop);
  }
}

function getTenantRolloutState(tenantId) {
  const k = String(tenantId || '');
  return _data.get(k) || null;
}

function setTenantRolloutState(tenantId, state) {
  const k = String(tenantId || '');
  _touch(k);
  _data.set(k, state && typeof state === 'object' ? { ...state, updated_at: new Date().toISOString() } : {});
  return _data.get(k);
}

function mergeTenantRolloutState(tenantId, patch) {
  const cur = getTenantRolloutState(tenantId) || {};
  const next = { ...cur, ...(patch && typeof patch === 'object' ? patch : {}) };
  return setTenantRolloutState(tenantId, next);
}

module.exports = {
  getTenantRolloutState,
  setTenantRolloutState,
  mergeTenantRolloutState
};
