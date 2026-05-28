'use strict';

const flags = require('../config/mqttRealFlags');

function getEffectiveMode(brokerMode) {
  const global = flags.mqttRealMode();
  if (global === 'off' || !flags.isMqttRealEnabled()) return 'off';
  const bm = String(brokerMode || 'shadow').toLowerCase();
  const order = { off: 0, shadow: 1, audit: 2, on: 3 };
  return Object.keys(order).find((k) => order[k] === Math.min(order[global] ?? 1, order[bm] ?? 1)) || 'shadow';
}

function isActiveForTenant(companyId) {
  if (!flags.isMqttRealEnabled()) return false;
  if (!companyId) return false;
  if (!flags.mqttPilotOnly()) return true;
  const pilots = flags.mqttPilotTenants();
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
    enabled: flags.isMqttRealEnabled(),
    mode: flags.mqttRealMode(),
    pilot_only: flags.mqttPilotOnly(),
    pilot_tenants: flags.mqttPilotTenants(),
    default_broker: flags.defaultBrokerUrl(),
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
