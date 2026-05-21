'use strict';

const _pilots = new Map();

const MINIMUM_MODULES = Object.freeze(['dashboard', 'settings']);

function registerPilotTenant(tenantId, meta = {}) {
  const key = String(tenantId);
  const existing = _pilots.get(key);
  _pilots.set(key, {
    tenant_id: key,
    registered_at: existing?.registered_at || new Date().toISOString(),
    approved_by: meta.approved_by || existing?.approved_by || null,
    label: meta.label || existing?.label || key,
    menu_only: meta.menu_only !== undefined ? meta.menu_only : existing?.menu_only !== false,
    channels_allowed: meta.channels_allowed || existing?.channels_allowed || ['menu'],
    kpi_snapshot: meta.kpi_snapshot || existing?.kpi_snapshot || null,
    kpi_activated_at: meta.kpi_activated_at || existing?.kpi_activated_at || null,
    summary_snapshot: meta.summary_snapshot || existing?.summary_snapshot || null,
    summary_activated_at: meta.summary_activated_at || existing?.summary_activated_at || null,
    active: meta.active !== false
  });
  return _pilots.get(key);
}

function isPilotTenant(tenantId) {
  const p = _pilots.get(String(tenantId));
  return !!(p && p.active);
}

function listPilotTenants() {
  return [..._pilots.values()];
}

function unregisterPilotTenant(tenantId) {
  return _pilots.delete(String(tenantId));
}

function clearPilotRegistry() {
  _pilots.clear();
}

function getPilotTenant(tenantId) {
  return _pilots.get(String(tenantId)) || null;
}

module.exports = {
  MINIMUM_MODULES,
  registerPilotTenant,
  isPilotTenant,
  listPilotTenants,
  unregisterPilotTenant,
  clearPilotRegistry,
  getPilotTenant
};
