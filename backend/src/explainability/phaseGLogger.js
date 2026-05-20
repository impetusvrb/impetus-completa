'use strict';

const EVENTS = new Set([
  'GOVERNANCE_DRIFT_DETECTED',
  'COGNITIVE_POLICY_REGRESSION',
  'EXPOSURE_PATTERN_SHIFT',
  'GOVERNANCE_TRACE_RECORDED',
  'GOVERNANCE_CONFLICT_DETECTED',
  'GOVERNANCE_OVERSIGHT_ESCALATION',
  'GOVERNANCE_AUDIT_APPENDED',
  'COGNITIVE_GOVERNANCE_SHADOW_REVIEW'
]);

function logPhaseG(event, payload = {}) {
  if (!EVENTS.has(event)) return;
  const line = JSON.stringify({ event, ts: new Date().toISOString(), ...payload });
  if (event.includes('DRIFT') || event.includes('REGRESSION') || event.includes('CONFLICT')) {
    console.warn(line);
  } else {
    console.log(line);
  }
}

module.exports = { logPhaseG, EVENTS };
