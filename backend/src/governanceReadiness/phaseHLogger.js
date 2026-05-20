'use strict';

const EVENTS = new Set([
  'GOVERNANCE_FALSE_POSITIVE',
  'GOVERNANCE_OVERBLOCKING',
  'GOVERNANCE_SANITIZER_EXCESS',
  'GOVERNANCE_CONTEXT_LOSS',
  'GOVERNANCE_READINESS_ASSESSED',
  'GOVERNANCE_ACTIVATION_BLOCKED',
  'GOVERNANCE_ACTIVATION_PLAN_READY',
  'GOVERNANCE_PROMOTION_DENIED',
  'GOVERNANCE_ROLLBACK_COORDINATED'
]);

function logPhaseH(event, payload = {}) {
  if (!EVENTS.has(event)) return;
  const line = JSON.stringify({ event, ts: new Date().toISOString(), ...payload });
  if (
    event.includes('BLOCKED') ||
    event.includes('DENIED') ||
    event.includes('FALSE_POSITIVE') ||
    event.includes('OVERBLOCKING') ||
    event.includes('EXCESS') ||
    event.includes('LOSS')
  ) {
    console.warn(line);
  } else {
    console.log(line);
  }
}

module.exports = { logPhaseH, EVENTS };
