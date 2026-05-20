'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isGovernanceOperationsEnabled: () => _flag('IMPETUS_GOVERNANCE_OPERATIONS', false),
  isGovernanceIncidentEngineEnabled: () => _flag('IMPETUS_GOVERNANCE_INCIDENT_ENGINE', false),
  isGovernanceRuntimeHealthEnabled: () => _flag('IMPETUS_GOVERNANCE_RUNTIME_HEALTH', false),
  isGovernanceEmergencyControlsEnabled: () => _flag('IMPETUS_GOVERNANCE_EMERGENCY_CONTROLS', false)
};
