'use strict';

const flags = require('../config/modbusRealFlags');

function getEffectiveMode(deviceMode) {
  const global = flags.modbusRealMode();
  if (global === 'off' || !flags.isModbusRealEnabled()) return 'off';
  const dm = String(deviceMode || 'shadow').toLowerCase();
  const order = { off: 0, shadow: 1, audit: 2, on: 3 };
  return Object.keys(order).find((k) => order[k] === Math.min(order[global] ?? 1, order[dm] ?? 1)) || 'shadow';
}

function isActiveForTenant(companyId) {
  if (!flags.isModbusRealEnabled()) return false;
  if (!companyId) return false;
  if (!flags.modbusPilotOnly()) return true;
  const pilots = flags.modbusPilotTenants();
  return pilots.length > 0 && pilots.includes(String(companyId));
}

function shouldPollReal(effectiveMode) {
  return effectiveMode === 'audit' || effectiveMode === 'on';
}

function shouldPersistIngest(effectiveMode) {
  if (effectiveMode === 'on') return true;
  if (effectiveMode === 'audit') return flags.auditPersistSamples();
  return false;
}

function getDiagnostics() {
  return {
    enabled: flags.isModbusRealEnabled(),
    mode: flags.modbusRealMode(),
    pilot_only: flags.modbusPilotOnly(),
    pilot_tenants: flags.modbusPilotTenants(),
    default_host: flags.defaultHost(),
    default_port: flags.defaultPort(),
    poll_interval_ms: flags.pollIntervalMs(),
    buffer_max: flags.bufferMax(),
    audit_persist: flags.auditPersistSamples(),
    invariants: flags.invariants,
  };
}

module.exports = {
  getEffectiveMode,
  isActiveForTenant,
  shouldPollReal,
  shouldPersistIngest,
  getDiagnostics,
};
