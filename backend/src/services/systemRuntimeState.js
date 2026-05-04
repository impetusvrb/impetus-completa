'use strict';

/**
 * Estado global adaptativo com histerese anti-flapping:
 * — permanência mínima antes de recuperar para HEALTHY
 * — score de estabilidade (decay) para decisões do watchdog
 * — razões LIMITED registadas para métricas (dominante)
 */

const resilienceMetrics = require('./resilienceMetricsService');

/** @type {{ status: 'HEALTHY'|'LIMITED'|'DEGRADED', last_failure: string|null, failure_count: number, degraded_reason: string|null, limited_reason: string|null, updated_at: string|null, state_since: string|null, stability_score: number }} */
const system_state = {
  status: 'HEALTHY',
  last_failure: null,
  failure_count: 0,
  degraded_reason: null,
  limited_reason: null,
  updated_at: null,
  state_since: null,
  stability_score: 100
};

let _enteredStateAt = Date.now();

function _minRecoveryDwellMs() {
  return Math.max(
    30000,
    Math.min(600000, parseInt(process.env.IMPETUS_STATE_RECOVERY_MIN_DWELL_MS || '', 10) || 90000)
  );
}

function _minDegradedDwellMs() {
  return Math.max(
    45000,
    Math.min(600000, parseInt(process.env.IMPETUS_STATE_DEGRADED_MIN_DWELL_MS || '', 10) || 120000)
  );
}

function _touch() {
  system_state.updated_at = new Date().toISOString();
}

function _setStateSince() {
  system_state.state_since = new Date().toISOString();
  _enteredStateAt = Date.now();
}

function getSnapshot() {
  return {
    status: system_state.status,
    last_failure: system_state.last_failure,
    failure_count: system_state.failure_count,
    degraded_reason: system_state.degraded_reason,
    limited_reason: system_state.limited_reason,
    updated_at: system_state.updated_at,
    state_since: system_state.state_since,
    stability_score: system_state.stability_score,
    entered_ms_ago: Math.max(0, Date.now() - _enteredStateAt),
    recovery_min_dwell_ms: _minRecoveryDwellMs(),
    can_recover_yet: canRecoverToHealthy()
  };
}

function canRecoverToHealthy() {
  return Date.now() - _enteredStateAt >= _minRecoveryDwellMs();
}

function canRecoverFromDegradedWatchdog() {
  return Date.now() - _enteredStateAt >= _minDegradedDwellMs();
}

/**
 * Score 0–100: sobe com ticks estáveis, desce com stress (anti-flapping suave).
 */
function adjustStabilityScore(delta) {
  system_state.stability_score = Math.max(0, Math.min(100, system_state.stability_score + delta));
}

function applyStabilityStableTick() {
  adjustStabilityScore(8);
}

function applyStabilityMildStress() {
  adjustStabilityScore(-12);
}

function applyStabilityHardFail() {
  adjustStabilityScore(-25);
}

function isDegraded() {
  return system_state.status === 'DEGRADED';
}

function isLimited() {
  return system_state.status === 'LIMITED';
}

/**
 * @param {string} reason
 * @param {string} [detail]
 * @param {{ force?: boolean }} [opts]
 */
function setDegraded(reason, detail, opts = {}) {
  if (!opts.force && system_state.status === 'DEGRADED') {
    _touch();
    return false;
  }
  const wasHealthyOrLimited = system_state.status !== 'DEGRADED';
  system_state.status = 'DEGRADED';
  system_state.last_failure = new Date().toISOString();
  if (wasHealthyOrLimited) system_state.failure_count += 1;
  system_state.degraded_reason =
    String(reason || 'UNKNOWN') + (detail ? `: ${String(detail).slice(0, 400)}` : '');
  system_state.limited_reason = null;
  applyStabilityHardFail();
  _setStateSince();
  _touch();
  if (wasHealthyOrLimited) {
    resilienceMetrics.recordLimitedTrigger(`DEGRADED:${reason}`);
    console.error(
      '[SYSTEM_DEGRADED]',
      JSON.stringify({
        reason,
        failure_count: system_state.failure_count,
        last_failure: system_state.last_failure,
        stability_score: system_state.stability_score
      })
    );
  }
  return true;
}

/**
 * @param {string} reason
 * @param {string} [detail]
 * @param {{ force?: boolean }} [opts]
 */
function setLimited(reason, detail, opts = {}) {
  if (system_state.status === 'DEGRADED') return false;
  const detailStr = detail ? String(detail).slice(0, 400) : '';
  const reasonKey = String(reason || 'UNKNOWN');

  if (system_state.status === 'LIMITED') {
    _touch();
    return false;
  }

  const debounceMs = opts.force
    ? 0
    : Math.max(0, parseInt(process.env.IMPETUS_LIMITED_ENTER_DEBOUNCE_MS || '', 10) || 0);
  if (debounceMs > 0 && !opts.force) {
    scheduleDebouncedLimited(reasonKey, detailStr, debounceMs);
    return false;
  }

  const wasHealthy = system_state.status === 'HEALTHY';
  system_state.status = 'LIMITED';
  system_state.last_failure = new Date().toISOString();
  system_state.limited_reason = reasonKey + (detailStr ? `: ${detailStr}` : '');
  system_state.degraded_reason = null;
  applyStabilityMildStress();
  _setStateSince();
  _touch();
  resilienceMetrics.recordLimitedTrigger(reasonKey);
  if (wasHealthy) {
    console.warn(
      '[SYSTEM_LIMITED]',
      JSON.stringify({
        reason: reasonKey,
        last_failure: system_state.last_failure,
        stability_score: system_state.stability_score
      })
    );
  }
  return true;
}

let _limitedDebounceTimer = null;
/** @type {{ reason: string, detail: string } | null} */
let _pendingLimited = null;

function scheduleDebouncedLimited(reason, detail, ms) {
  _pendingLimited = { reason, detail };
  if (_limitedDebounceTimer) clearTimeout(_limitedDebounceTimer);
  _limitedDebounceTimer = setTimeout(() => {
    _limitedDebounceTimer = null;
    if (!_pendingLimited) return;
    if (system_state.status !== 'HEALTHY') {
      _pendingLimited = null;
      return;
    }
    const p = _pendingLimited;
    _pendingLimited = null;
    setLimited(p.reason, p.detail, { force: true });
  }, ms);
}

/**
 * Recuperação para HEALTHY com histerese temporal (anti-flapping).
 * @param {{ force?: boolean, source?: string }} [opts]
 */
function setHealthy(opts = {}) {
  const prev = system_state.status;
  const prevReason = system_state.degraded_reason || system_state.limited_reason;

  if (prev === 'HEALTHY') {
    _touch();
    return true;
  }

  if (!opts.force && !canRecoverToHealthy()) {
    console.info(
      '[SYSTEM_HEALTHY_DEFERRED]',
      JSON.stringify({
        previous_status: prev,
        dwell_ms: Date.now() - _enteredStateAt,
        required_ms: _minRecoveryDwellMs(),
        source: opts.source || 'unknown'
      })
    );
    return false;
  }

  if (prev !== 'HEALTHY') {
    console.info(
      '[SYSTEM_HEALTHY]',
      JSON.stringify({ previous_status: prev, previous_reason: prevReason, source: opts.source || 'unknown' })
    );
  }
  system_state.status = 'HEALTHY';
  system_state.degraded_reason = null;
  system_state.limited_reason = null;
  system_state.stability_score = Math.min(100, system_state.stability_score + 15);
  _setStateSince();
  _touch();
  _pendingLimited = null;
  if (_limitedDebounceTimer) {
    clearTimeout(_limitedDebounceTimer);
    _limitedDebounceTimer = null;
  }
  return true;
}

/**
 * Recuperação desde DEGRADED no watchdog (permanência extra).
 */
function trySetHealthyFromWatchdog() {
  if (system_state.status === 'DEGRADED' && !canRecoverFromDegradedWatchdog()) {
    console.info(
      '[WATCHDOG_RECOVERY_DEFERRED]',
      JSON.stringify({
        dwell_ms: Date.now() - _enteredStateAt,
        required_degraded_ms: _minDegradedDwellMs()
      })
    );
    return false;
  }
  return setHealthy({ force: false, source: 'watchdog' });
}

function getStabilityScore() {
  return system_state.stability_score;
}

_setStateSince();
_touch();

module.exports = {
  system_state,
  getSnapshot,
  getStabilityScore,
  isDegraded,
  isLimited,
  setDegraded,
  setLimited,
  setHealthy,
  trySetHealthyFromWatchdog,
  canRecoverToHealthy,
  adjustStabilityScore,
  applyStabilityStableTick,
  applyStabilityMildStress,
  applyStabilityHardFail
};
