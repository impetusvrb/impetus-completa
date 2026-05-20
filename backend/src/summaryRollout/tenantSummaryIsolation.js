'use strict';

const _state = new Map();

function getTenantSummaryState(tenantId) {
  const key = String(tenantId || 'global');
  if (!_state.has(key)) {
    _state.set(key, { rollout_active: false, activated_at: null, observation_only: true });
  }
  return _state.get(key);
}

function setTenantSummaryRolloutActive(tenantId, active, meta = {}) {
  const s = getTenantSummaryState(tenantId);
  s.rollout_active = !!active;
  if (active) {
    s.activated_at = new Date().toISOString();
    s.approved_by = meta.approved_by || null;
    s.observation_only = false;
  }
  return s;
}

function clearTenantSummaryState() {
  _state.clear();
}

module.exports = { getTenantSummaryState, setTenantSummaryRolloutActive, clearTenantSummaryState };
