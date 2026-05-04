'use strict';

/**
 * Estado global de protecção do processo IMPETUS (HEALTHY / DEGRADED).
 * Actualizado pelo watchdog de arquitectura e por falhas STRICT em rajada.
 */

/** @type {{ status: 'HEALTHY'|'DEGRADED', last_failure: string|null, failure_count: number, degraded_reason: string|null, updated_at: string|null }} */
const system_state = {
  status: 'HEALTHY',
  last_failure: null,
  failure_count: 0,
  degraded_reason: null,
  updated_at: null
};

function _touch() {
  system_state.updated_at = new Date().toISOString();
}

function getSnapshot() {
  return {
    status: system_state.status,
    last_failure: system_state.last_failure,
    failure_count: system_state.failure_count,
    degraded_reason: system_state.degraded_reason,
    updated_at: system_state.updated_at
  };
}

function isDegraded() {
  return system_state.status === 'DEGRADED';
}

/**
 * @param {string} reason
 * @param {string} [detail]
 */
function setDegraded(reason, detail) {
  const wasHealthy = system_state.status === 'HEALTHY';
  system_state.status = 'DEGRADED';
  system_state.last_failure = new Date().toISOString();
  if (wasHealthy) system_state.failure_count += 1;
  system_state.degraded_reason = String(reason || 'UNKNOWN') + (detail ? `: ${String(detail).slice(0, 400)}` : '');
  _touch();
  if (wasHealthy) {
    console.error(
      '[SYSTEM_DEGRADED]',
      JSON.stringify({
        reason,
        failure_count: system_state.failure_count,
        last_failure: system_state.last_failure
      })
    );
  }
}

function setHealthy() {
  if (system_state.status !== 'HEALTHY') {
    console.info('[SYSTEM_HEALTHY]', JSON.stringify({ previous_reason: system_state.degraded_reason }));
  }
  system_state.status = 'HEALTHY';
  system_state.degraded_reason = null;
  _touch();
}

module.exports = {
  system_state,
  getSnapshot,
  isDegraded,
  setDegraded,
  setHealthy
};
