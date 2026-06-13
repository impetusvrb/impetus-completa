'use strict';

/**
 * AIOI-P1.1 — Workflow State Machine (certificação formal)
 *
 * Mapeamento canónico ORG-5 / P1:
 *   OPEN        → open
 *   TRIAGED     → triaged
 *   PROPOSED    → pending_approval
 *   APPROVED    → approved
 *   EXECUTING   → in_progress
 *   COMPLETED   → resolved | closed
 *   LEARNING    → resolved + learning_context
 */

const CANONICAL_TO_IOE = Object.freeze({
  OPEN:       'open',
  TRIAGED:    'triaged',
  PROPOSED:   'pending_approval',
  APPROVED:   'approved',
  EXECUTING:  'in_progress',
  COMPLETED:  'resolved',
  LEARNING:   'resolved'
});

const VALID_TRANSITIONS = Object.freeze({
  open:               ['triaged'],
  triaged:            ['pending_approval'],
  pending_approval:   ['approved', 'rejected'],
  approved:           ['in_progress'],
  in_progress:        ['resolved', 'closed', 'escalated'],
  resolved:           [],
  closed:             [],
  rejected:           [],
  escalated:          ['in_progress', 'resolved']
});

const FORBIDDEN_TRANSITIONS = Object.freeze([
  ['open', 'approved'],
  ['open', 'in_progress'],
  ['open', 'resolved'],
  ['open', 'closed'],
  ['triaged', 'in_progress'],
  ['triaged', 'resolved'],
  ['triaged', 'closed'],
  ['pending_approval', 'in_progress'],
  ['pending_approval', 'resolved'],
  ['pending_approval', 'closed']
]);

function isValidTransition(fromStatus, toStatus) {
  const allowed = VALID_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

function isForbiddenTransition(fromStatus, toStatus) {
  return FORBIDDEN_TRANSITIONS.some(([f, t]) => f === fromStatus && t === toStatus);
}

function assertValidTransition(fromStatus, toStatus) {
  if (isForbiddenTransition(fromStatus, toStatus)) {
    return { ok: false, error: `FORBIDDEN_TRANSITION: ${fromStatus} → ${toStatus}` };
  }
  if (!isValidTransition(fromStatus, toStatus)) {
    return { ok: false, error: `INVALID_TRANSITION: ${fromStatus} → ${toStatus}` };
  }
  return { ok: true };
}

module.exports = {
  CANONICAL_TO_IOE,
  VALID_TRANSITIONS,
  FORBIDDEN_TRANSITIONS,
  isValidTransition,
  isForbiddenTransition,
  assertValidTransition
};
