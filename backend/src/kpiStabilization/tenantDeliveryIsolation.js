'use strict';

const _state = new Map();

function tenantKey(tenantId) {
  return String(tenantId || 'global');
}

function getTenantStabilizationState(tenantId) {
  const key = tenantKey(tenantId);
  if (!_state.has(key)) {
    _state.set(key, { stabilization_observations: 0, last_stable: null, isolated: true });
  }
  return _state.get(key);
}

function recordTenantObservation(tenantId) {
  const s = getTenantStabilizationState(tenantId);
  s.stabilization_observations += 1;
  return s;
}

function clearTenantStabilizationState() {
  _state.clear();
}

module.exports = { getTenantStabilizationState, recordTenantObservation, clearTenantStabilizationState };
