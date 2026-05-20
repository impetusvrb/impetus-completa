'use strict';

const EVENTS = new Set([
  'CHAT_CONTEXT_SANITIZED',
  'CHAT_POLICY_APPLIED',
  'CHAT_SCOPE_DENIED',
  'CHAT_CROSS_DOMAIN_BLOCKED',
  'CHAT_KPI_DENIED',
  'KPI_POLICY_APPLIED',
  'KPI_DENIED',
  'KPI_INFERENCE_BLOCKED',
  'KPI_SCOPE_SANITIZED',
  'SUMMARY_SANITIZED',
  'SUMMARY_POLICY_APPLIED',
  'SUMMARY_CONTEXT_DENIED',
  'COGNITIVE_GOVERNANCE_SHADOW_DIFF',
  'COGNITIVE_EXPOSURE_DIVERGENCE',
  'COGNITIVE_POLICY_MISMATCH',
  'COGNITIVE_GOVERNANCE_METRIC',
  'COGNITIVE_BOUNDARY_BLOCKED'
]);

function logPhaseF(event, payload = {}) {
  if (!EVENTS.has(event)) return;
  const line = JSON.stringify({ event, ts: new Date().toISOString(), ...payload });
  if (
    event.includes('DENIED') ||
    event.includes('BLOCKED') ||
    event.includes('DIVERGENCE') ||
    event.includes('MISMATCH')
  ) {
    console.warn(line);
  } else {
    console.log(line);
  }
}

module.exports = { logPhaseF, EVENTS };
