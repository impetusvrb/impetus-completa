'use strict';

const _tenants = new Map();

function tenantKey(tenantId) {
  return String(tenantId || 'global');
}

function defaultState() {
  return {
    enforcement_active: false,
    channels: { menu: false, dashboard: false, kpi: false, summary: false },
    activated_at: null,
    approved_by: null,
    progressive_step: 0,
    rollback_marker: null
  };
}

function getTenantEnforcementState(tenantId) {
  const key = tenantKey(tenantId);
  if (!_tenants.has(key)) _tenants.set(key, defaultState());
  return _tenants.get(key);
}

function setTenantEnforcementActive(tenantId, active, meta = {}) {
  const s = getTenantEnforcementState(tenantId);
  s.enforcement_active = !!active;
  if (active) {
    s.activated_at = new Date().toISOString();
    s.approved_by = meta.approved_by || null;
    s.rollback_marker = meta.rollback_marker || `z2-${Date.now()}`;
    if (meta.channels) Object.assign(s.channels, meta.channels);
  } else {
    s.channels = { menu: false, dashboard: false, kpi: false, summary: false };
    s.progressive_step = 0;
  }
  return s;
}

function setTenantEnforcementChannel(tenantId, channel, active) {
  const s = getTenantEnforcementState(tenantId);
  if (s.channels[channel] !== undefined) s.channels[channel] = !!active;
  return s;
}

function clearTenantEnforcementState() {
  _tenants.clear();
}

module.exports = {
  getTenantEnforcementState,
  setTenantEnforcementActive,
  setTenantEnforcementChannel,
  clearTenantEnforcementState
};
