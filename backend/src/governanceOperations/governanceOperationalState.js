'use strict';

/**
 * Estado operacional da governança (em memória, reversível).
 */

const { logPhaseJ } = require('./phaseJLogger');

const VALID_STATES = [
  'shadow_only',
  'partial_governance',
  'controlled_activation',
  'stabilized',
  'degraded',
  'rollback_ready',
  'emergency_mode'
];

let _state = 'shadow_only';
let _transitions = [];

function getOperationalState() {
  return {
    state: _state,
    valid_states: VALID_STATES,
    last_transition_at: _transitions.length ? _transitions[_transitions.length - 1].at : null,
    transition_count: _transitions.length
  };
}

function transitionTo(nextState, meta = {}) {
  if (!VALID_STATES.includes(nextState)) {
    return { changed: false, reason: 'invalid_state', state: _state };
  }
  const prev = _state;
  if (prev === nextState) {
    return { changed: false, reason: 'already_in_state', state: _state };
  }
  _state = nextState;
  const record = {
    from: prev,
    to: nextState,
    at: new Date().toISOString(),
    ...meta
  };
  _transitions.push(record);
  if (_transitions.length > 500) _transitions.shift();

  logPhaseJ('GOVERNANCE_OPERATIONAL_STATE_CHANGED', record);

  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({
      type: 'state_transition',
      from: prev,
      to: nextState,
      ...meta
    });
  } catch {
    /* optional */
  }

  return { changed: true, previous: prev, state: _state, record };
}

function inferStateFromRuntime(runtimeSnapshot = {}) {
  const global = runtimeSnapshot.global_channels || {};
  const activeCount = Object.values(global).filter(Boolean).length;
  if (_state === 'emergency_mode') return _state;
  if (runtimeSnapshot.degraded) return 'degraded';
  if (runtimeSnapshot.rollback_ready) return 'rollback_ready';
  if (activeCount === 0) return 'shadow_only';
  if (activeCount < 4) return 'partial_governance';
  if (runtimeSnapshot.controlled_framework) return 'controlled_activation';
  return 'stabilized';
}

function syncFromRuntime(runtimeSnapshot = {}) {
  const inferred = inferStateFromRuntime(runtimeSnapshot);
  if (inferred !== _state && _state !== 'emergency_mode') {
    return transitionTo(inferred, { source: 'runtime_sync', auto: false });
  }
  return { changed: false, state: _state, inferred };
}

function listTransitions(limit = 50) {
  return _transitions.slice(-limit);
}

function resetForTests() {
  _state = 'shadow_only';
  _transitions.length = 0;
}

module.exports = {
  VALID_STATES,
  getOperationalState,
  transitionTo,
  inferStateFromRuntime,
  syncFromRuntime,
  listTransitions,
  resetForTests
};
