'use strict';

const flags = require('../config/edgeRuntimeFlags');

function getEffectiveMode(localMode) {
  const global = flags.edgeRuntimeMode();
  if (global === 'off' || !flags.isEdgeRuntimeRealEnabled()) return 'off';
  const lm = String(localMode || 'shadow').toLowerCase();
  const order = { off: 0, shadow: 1, audit: 2, on: 3 };
  return Object.keys(order).find((k) => order[k] === Math.min(order[global] ?? 1, order[lm] ?? 1)) || 'shadow';
}

function isActiveForTenant(companyId) {
  if (!flags.isEdgeRuntimeRealEnabled()) return false;
  if (!companyId) return false;
  if (!flags.edgePilotOnly()) return true;
  const pilots = flags.edgePilotTenants();
  return pilots.length > 0 && pilots.includes(String(companyId));
}

function shouldPersistQueue(effectiveMode) {
  if (!flags.persistQueue()) return false;
  return effectiveMode === 'audit' || effectiveMode === 'on';
}

function shouldSyncToIngest(effectiveMode) {
  return effectiveMode === 'on';
}

function getDiagnostics() {
  return {
    enabled: flags.isEdgeRuntimeRealEnabled(),
    mode: flags.edgeRuntimeMode(),
    pilot_only: flags.edgePilotOnly(),
    pilot_tenants: flags.edgePilotTenants(),
    persist_queue: flags.persistQueue(),
    buffer_max: flags.bufferMax(),
    industrial_lab: flags.isIndustrialLabEnabled(),
    lab_auto_e2e_boot: flags.labAutoE2eOnBoot(),
    invariants: flags.invariants,
  };
}

module.exports = {
  getEffectiveMode,
  isActiveForTenant,
  shouldPersistQueue,
  shouldSyncToIngest,
  getDiagnostics,
};
