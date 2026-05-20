'use strict';

const _state = new Map();

function tenantKey(tenantId) {
  return String(tenantId || 'global');
}

function getTenantKpiState(tenantId) {
  const key = tenantKey(tenantId);
  if (!_state.has(key)) {
    _state.set(key, {
      rollout_active: false,
      activated_at: null,
      approved_by: null,
      observation_only: true
    });
  }
  return _state.get(key);
}

function setTenantKpiRolloutActive(tenantId, active, meta = {}) {
  const s = getTenantKpiState(tenantId);
  s.rollout_active = !!active;
  if (active) {
    s.activated_at = new Date().toISOString();
    s.approved_by = meta.approved_by || null;
    s.observation_only = false;
  } else {
    s.observation_only = true;
  }
  return s;
}

function clearTenantKpiState() {
  _state.clear();
}

module.exports = { getTenantKpiState, setTenantKpiRolloutActive, clearTenantKpiState, tenantKey };
