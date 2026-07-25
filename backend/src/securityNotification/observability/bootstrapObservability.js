'use strict';

const initialState = () => ({
  schema_version: 'sec05_bootstrap_status_v1',
  phase: 'SEC-05',
  status: 'not_started',
  enabled: null,
  attempts: 0,
  bootstrap_failures: 0,
  cycle_failures: 0,
  source_failures: 0,
  last_attempt_at: null,
  last_success_at: null,
  last_failure_at: null,
  last_cycle_at: null,
  last_cycle_stage: null,
  last_error: null,
  current_cycle_source_failures: 0
});

let state = initialState();

function nowIso() {
  return new Date().toISOString();
}

function safeError(error) {
  return {
    name: String(error?.name || 'Error').slice(0, 80),
    code: error?.code ? String(error.code).slice(0, 80) : null
  };
}

function recordAttempt(enabled) {
  state.attempts += 1;
  state.enabled = Boolean(enabled);
  state.status = enabled ? 'starting' : 'disabled';
  state.last_attempt_at = nowIso();
  state.last_error = null;
}

function recordBootstrapScheduled() {
  state.status = 'starting';
}

function recordBootstrapFailure(stage, error) {
  state.status = 'failed';
  state.bootstrap_failures += 1;
  state.last_failure_at = nowIso();
  state.last_error = { stage, ...safeError(error) };
}

function recordCycleStart(stage) {
  state.last_cycle_at = nowIso();
  state.last_cycle_stage = stage;
  state.current_cycle_source_failures = 0;
}

function recordSourceFailure(source, error) {
  state.status = 'degraded';
  state.source_failures += 1;
  state.current_cycle_source_failures += 1;
  state.last_failure_at = nowIso();
  state.last_error = { stage: 'source_read', source, ...safeError(error) };
}

function recordCycleSuccess(stage) {
  state.last_cycle_at = nowIso();
  state.last_cycle_stage = stage;
  if (state.current_cycle_source_failures === 0) {
    state.status = 'running';
    state.last_success_at = state.last_cycle_at;
    state.last_error = null;
  }
}

function recordCycleFailure(stage, error) {
  state.status = stage === 'initial' ? 'failed' : 'degraded';
  state.cycle_failures += 1;
  state.last_failure_at = nowIso();
  state.last_error = { stage: `${stage}_cycle`, ...safeError(error) };
}

function recordStopped() {
  state.status = 'stopped';
}

function getSnapshot() {
  return {
    ...state,
    last_error: state.last_error ? { ...state.last_error } : null
  };
}

function toLogEvent() {
  const snapshot = getSnapshot();
  return {
    phase: snapshot.phase,
    status: snapshot.status,
    enabled: snapshot.enabled,
    attempts: snapshot.attempts,
    bootstrap_failures: snapshot.bootstrap_failures,
    cycle_failures: snapshot.cycle_failures,
    source_failures: snapshot.source_failures,
    last_cycle_stage: snapshot.last_cycle_stage,
    last_error: snapshot.last_error
  };
}

function resetForTests() {
  state = initialState();
}

module.exports = {
  recordAttempt,
  recordBootstrapScheduled,
  recordBootstrapFailure,
  recordCycleStart,
  recordSourceFailure,
  recordCycleSuccess,
  recordCycleFailure,
  recordStopped,
  getSnapshot,
  toLogEvent,
  resetForTests
};
