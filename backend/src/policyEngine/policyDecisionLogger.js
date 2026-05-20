'use strict';

/**
 * Logs estruturados JSON — Fase E Cognitive Governance.
 */

const EVENTS = new Set([
  'COGNITIVE_POLICY_APPLIED',
  'COGNITIVE_POLICY_DENIED',
  'COGNITIVE_SCOPE_BLOCKED',
  'COGNITIVE_FAILSAFE_TRIGGERED',
  'COGNITIVE_CONTEXT_SANITIZED',
  'COGNITIVE_ENVELOPE_RESOLVED',
  'COGNITIVE_POLICY_CONFLICT'
]);

function logCognitive(event, payload = {}) {
  if (!EVENTS.has(event)) return;
  const line = JSON.stringify({
    event,
    ts: new Date().toISOString(),
    ...payload
  });
  if (event.includes('DENIED') || event.includes('BLOCKED') || event.includes('FAILSAFE') || event.includes('CONFLICT')) {
    console.warn(line);
  } else {
    console.log(line);
  }
}

module.exports = { logCognitive, EVENTS };
