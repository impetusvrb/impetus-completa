'use strict';

/**
 * CERT-EVENT-RETENTION-01 — Estados canónicos do ciclo de vida do Event Backbone.
 * Nunca inferidos manualmente em consumidores; sempre auditáveis.
 */

const LIFECYCLE_STATES = Object.freeze({
  ACTIVE: 'ACTIVE',
  CONSOLIDATED: 'CONSOLIDATED',
  ARCHIVED: 'ARCHIVED',
  HISTORICAL: 'HISTORICAL',
  PURGE_ELIGIBLE: 'PURGE_ELIGIBLE',
  PURGED: 'PURGED'
});

/** Transições permitidas (grafo dirigido) */
const ALLOWED_TRANSITIONS = Object.freeze({
  ACTIVE: ['CONSOLIDATED', 'ARCHIVED'],
  CONSOLIDATED: ['ARCHIVED', 'HISTORICAL'],
  ARCHIVED: ['HISTORICAL', 'PURGE_ELIGIBLE'],
  HISTORICAL: ['PURGE_ELIGIBLE'],
  PURGE_ELIGIBLE: ['PURGED'],
  PURGED: []
});

function isValidState(state) {
  return Object.values(LIFECYCLE_STATES).includes(String(state || '').toUpperCase());
}

function canTransition(fromState, toState) {
  const from = String(fromState || '').toUpperCase();
  const to = String(toState || '').toUpperCase();
  if (!isValidState(from) || !isValidState(to)) return false;
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

function assertTransition(fromState, toState) {
  if (!canTransition(fromState, toState)) {
    throw new Error(`invalid_lifecycle_transition:${fromState}->${toState}`);
  }
}

module.exports = {
  LIFECYCLE_STATES,
  ALLOWED_TRANSITIONS,
  isValidState,
  canTransition,
  assertTransition
};
