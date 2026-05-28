'use strict';

const flags = require('../config/opcuaRealFlags');

function getEffectiveMode(serverMode) {
  const global = flags.opcuaRealMode();
  if (global === 'off' || !flags.isOpcUaRealEnabled()) return 'off';
  const sm = String(serverMode || 'shadow').toLowerCase();
  const order = { off: 0, shadow: 1, audit: 2, on: 3 };
  return Object.keys(order).find((k) => order[k] === Math.min(order[global] ?? 1, order[sm] ?? 1)) || 'shadow';
}

function isActiveForTenant(companyId) {
  if (!flags.isOpcUaRealEnabled()) return false;
  if (!companyId) return false;
  if (!flags.opcuaPilotOnly()) return true;
  const pilots = flags.opcuaPilotTenants();
  return pilots.length > 0 && pilots.includes(String(companyId));
}

function shouldConnectReal(effectiveMode) {
  return effectiveMode === 'audit' || effectiveMode === 'on';
}

function shouldPersistIngest(effectiveMode) {
  if (effectiveMode === 'on') return true;
  if (effectiveMode === 'audit') return flags.auditPersistSamples();
  return false;
}

function useSimulation(effectiveMode) {
  return effectiveMode === 'off' || effectiveMode === 'shadow';
}

function getDiagnostics() {
  return {
    enabled: flags.isOpcUaRealEnabled(),
    mode: flags.opcuaRealMode(),
    pilot_only: flags.opcuaPilotOnly(),
    pilot_tenants: flags.opcuaPilotTenants(),
    default_endpoint: flags.defaultEndpointUrl(),
    buffer_max: flags.bufferMax(),
    audit_persist: flags.auditPersistSamples(),
    invariants: flags.invariants,
  };
}

module.exports = {
  getEffectiveMode,
  isActiveForTenant,
  shouldConnectReal,
  shouldPersistIngest,
  useSimulation,
  getDiagnostics,
};
