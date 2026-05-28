'use strict';

const flags = require('../config/tenantRlsFlags');

function getEffectiveMode(registryMode) {
  const global = flags.rlsMode();
  if (global === 'off' || !flags.isRlsEnabled()) return 'off';
  const rm = String(registryMode || 'shadow').toLowerCase();
  const order = { off: 0, shadow: 1, audit: 2, on: 3 };
  return Object.keys(order).find((k) => order[k] === Math.min(order[global] ?? 1, order[rm] ?? 1)) || 'shadow';
}

function isActiveForTenant(companyId) {
  if (!flags.isRlsEnabled()) return false;
  if (!companyId) return false;
  if (!flags.rlsPilotOnly()) return true;
  const pilots = flags.rlsPilotTenants();
  return pilots.length > 0 && pilots.includes(String(companyId));
}

function shouldEnforceRls(effectiveMode) {
  return effectiveMode === 'on';
}

function shouldRunFuzz(effectiveMode) {
  return flags.fuzzEnabled() && effectiveMode !== 'off';
}

function getDiagnostics() {
  return {
    enabled: flags.isRlsEnabled(),
    mode: flags.rlsMode(),
    pilot_only: flags.rlsPilotOnly(),
    pilot_tenants: flags.rlsPilotTenants(),
    fuzz: flags.fuzzEnabled(),
    chaos: flags.chaosEnabled(),
    invariants: flags.invariants,
  };
}

module.exports = {
  getEffectiveMode,
  isActiveForTenant,
  shouldEnforceRls,
  shouldRunFuzz,
  getDiagnostics,
};
