'use strict';

const _stateByKey = new Map();

function stateKey(user, ctx = {}) {
  return `${user?.id || 'anon'}:${user?.company_id || 't0'}:${ctx.functional_axis || user?.functional_axis || 'general'}`;
}

function setRuntimeTruthState(user, truth, ctx = {}) {
  const key = stateKey(user, ctx);
  const entry = {
    ...truth,
    updated_at: new Date().toISOString(),
    key
  };
  _stateByKey.set(key, entry);
  return entry;
}

function getRuntimeTruthState(user, ctx = {}) {
  const key = stateKey(user, ctx);
  return _stateByKey.get(key) || null;
}

function clearRuntimeTruthState() {
  _stateByKey.clear();
}

module.exports = { setRuntimeTruthState, getRuntimeTruthState, clearRuntimeTruthState, stateKey };
