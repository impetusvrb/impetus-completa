'use strict';

const _activationMeta = new Map();

function key(tenantId) {
  return String(tenantId || 'global');
}

function defaultMeta() {
  return {
    summary_activation_active: false,
    activated_at: null,
    approved_by: null,
    summary_snapshot: null,
    last_delivery_hash: null,
    oscillation_events: 0,
    rollback_marker: null
  };
}

function getSummaryRuntimeMeta(tenantId) {
  const k = key(tenantId);
  if (!_activationMeta.has(k)) _activationMeta.set(k, defaultMeta());
  return _activationMeta.get(k);
}

function setSummaryActivationMeta(tenantId, patch = {}) {
  const m = getSummaryRuntimeMeta(tenantId);
  Object.assign(m, patch);
  return m;
}

function clearSummaryRuntimeState() {
  _activationMeta.clear();
}

module.exports = {
  getSummaryRuntimeMeta,
  setSummaryActivationMeta,
  clearSummaryRuntimeState
};
