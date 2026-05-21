'use strict';

const fs = require('fs');
const path = require('path');
const { logPhaseZ17 } = require('./phaseZ17Logger');

const STORE_DIR = path.join(__dirname, '../../data/operational-validation');
const STORE_FILE = path.join(STORE_DIR, 'pilot-activations.json');

function _defaultStore() {
  return { version: 1, updated_at: null, tenants: [] };
}

function _readStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) return _defaultStore();
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tenants)) return _defaultStore();
    return parsed;
  } catch (e) {
    logPhaseZ17('PILOT_PERSISTENCE_READ_ERROR', { error: e.message });
    return _defaultStore();
  }
}

function _writeStore(store) {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    store.updated_at = new Date().toISOString();
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
    return true;
  } catch (e) {
    logPhaseZ17('PILOT_PERSISTENCE_WRITE_ERROR', { error: e.message });
    return false;
  }
}

function normalizeTenantRecord(record = {}) {
  const tenantId = String(record.tenant_id || '');
  return {
    tenant_id: tenantId,
    pilot_active: record.pilot_active === true,
    menu_active: record.menu_active !== false,
    kpi_active: record.kpi_active === true,
    summary_active: record.summary_active === true,
    governance_locked: record.governance_locked === true,
    activated_by: record.activated_by || null,
    activated_at: record.activated_at || new Date().toISOString(),
    reload_recovery_ready: record.reload_recovery_ready !== false,
    channels_allowed: record.channels_allowed || ['menu', 'kpi'],
    terminal_governance_locked: record.terminal_governance_locked === true,
    rollout_readiness: record.rollout_readiness || 'pilot_validated'
  };
}

function saveTenantActivation(record = {}) {
  const normalized = normalizeTenantRecord(record);
  if (!normalized.tenant_id) return { saved: false, reason: 'tenant_id_required' };
  const store = _readStore();
  const idx = store.tenants.findIndex((t) => t.tenant_id === normalized.tenant_id);
  if (idx >= 0) store.tenants[idx] = { ...store.tenants[idx], ...normalized };
  else store.tenants.push(normalized);
  const ok = _writeStore(store);
  if (ok) logPhaseZ17('PILOT_ACTIVATION_PERSISTED', { tenant_id: normalized.tenant_id });
  return { saved: ok, record: normalized };
}

function removeTenantActivation(tenantId) {
  const store = _readStore();
  const before = store.tenants.length;
  store.tenants = store.tenants.filter((t) => t.tenant_id !== String(tenantId));
  const ok = _writeStore(store);
  return { removed: before !== store.tenants.length, saved: ok };
}

function listPersistedTenants() {
  return _readStore().tenants.map(normalizeTenantRecord);
}

function getPersistedTenant(tenantId) {
  const store = _readStore();
  const found = store.tenants.find((t) => t.tenant_id === String(tenantId));
  return found ? normalizeTenantRecord(found) : null;
}

function listReloadRecoveryReady() {
  return listPersistedTenants().filter((t) => t.reload_recovery_ready && t.pilot_active);
}

module.exports = {
  STORE_FILE,
  normalizeTenantRecord,
  saveTenantActivation,
  removeTenantActivation,
  listPersistedTenants,
  getPersistedTenant,
  listReloadRecoveryReady,
  _readStore
};
