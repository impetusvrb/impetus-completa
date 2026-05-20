'use strict';

const EVENTS = new Set([
  'KPI_GOVERNANCE_ACTIVATED',
  'KPI_GOVERNANCE_ROLLBACK_READY',
  'KPI_GOVERNANCE_RUNTIME_VALIDATED',
  'SUMMARY_GOVERNANCE_ACTIVATED',
  'SUMMARY_SANITIZATION_RUNTIME',
  'SUMMARY_CONTEXT_DEGRADATION',
  'CHAT_GOVERNANCE_ACTIVATED',
  'CHAT_CONTEXT_RESTRICTED',
  'CHAT_RESPONSE_DEGRADATION',
  'CHAT_LEAKAGE_PREVENTED',
  'BOUNDARY_GUARD_ACTIVATED',
  'BOUNDARY_VIOLATION_BLOCKED',
  'BOUNDARY_RUNTIME_ENFORCED',
  'GOVERNANCE_ACTIVATION_APPROVED',
  'GOVERNANCE_ACTIVATION_DENIED',
  'GOVERNANCE_RUNTIME_DEGRADED',
  'GOVERNANCE_ROLLBACK_READY',
  'GOVERNANCE_RUNTIME_HEALTH',
  'TENANT_GOVERNANCE_PROMOTED',
  'TENANT_GOVERNANCE_ISOLATED'
]);

function logPhaseI(event, payload = {}) {
  if (!EVENTS.has(event)) return;
  const line = JSON.stringify({ event, ts: new Date().toISOString(), ...payload });
  if (
    event.includes('DENIED') ||
    event.includes('DEGRADED') ||
    event.includes('DEGRADATION') ||
    event.includes('VIOLATION')
  ) {
    console.warn(line);
  } else {
    console.log(line);
  }
}

module.exports = { logPhaseI, EVENTS };
