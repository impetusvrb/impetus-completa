'use strict';

/**
 * AIOI-P3.5 — Production Stability Service
 *
 * Registo de estabilidade operacional do piloto — observação only.
 * Spec: backend/docs/AIOI_PRODUCTION_STABILITY_SPECIFICATION.md
 */

const operationalTelemetry = require('./aioiOperationalTelemetryService');

const LAYER = 'AIOI_PRODUCTION_STABILITY';

let _workerStartedAt = null;
let _restartCount = 0;
let _processingCycles = 0;
let _failedCycles = 0;
let _healthTransitions = [];
let _batchDurations = [];
let _processingLatencies = [];

const MAX_SAMPLES = 200;

function _pushSample(arr, value) {
  arr.push(value);
  if (arr.length > MAX_SAMPLES) arr.shift();
}

function markWorkerStarted() {
  if (!_workerStartedAt) {
    _workerStartedAt = Date.now();
  }
}

function recordRestart() {
  _restartCount++;
  operationalTelemetry.emit('worker_restart_recorded', { restart_count: _restartCount });
}

/**
 * Regista conclusão de ciclo worker (chamada additive pelo outbox worker).
 * @param {object} params
 * @param {boolean} params.ok
 * @param {number} [params.elapsedMs]
 * @param {number} [params.processed]
 */
function recordCycle({ ok, elapsedMs, processed }) {
  if (ok) {
    _processingCycles++;
  } else {
    _failedCycles++;
  }

  if (typeof elapsedMs === 'number' && elapsedMs >= 0) {
    _pushSample(_batchDurations, elapsedMs);
  }

  if (typeof processed === 'number' && processed > 0 && typeof elapsedMs === 'number') {
    _pushSample(_processingLatencies, Math.round(elapsedMs / processed));
  }
}

/**
 * Regista transição de health status.
 * @param {string} fromStatus
 * @param {string} toStatus
 */
function recordHealthTransition(fromStatus, toStatus) {
  const entry = {
    from: fromStatus,
    to:   toStatus,
    ts:   new Date().toISOString()
  };
  _healthTransitions.push(entry);
  if (_healthTransitions.length > MAX_SAMPLES) {
    _healthTransitions.shift();
  }
  operationalTelemetry.emit('health_transition', entry);
}

function _average(arr) {
  if (!arr.length) return null;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

/**
 * Snapshot de estabilidade operacional.
 * @returns {object}
 */
function getStabilitySnapshot() {
  const outboxWorker = require('./aioiOutboxWorkerService');
  const workerStatus = outboxWorker.getWorkerStatus();

  if (workerStatus.worker_running && !_workerStartedAt) {
    markWorkerStarted();
  }

  const workerUptimeMs = _workerStartedAt
    ? Date.now() - _workerStartedAt
    : 0;

  return {
    worker_uptime_ms:            workerUptimeMs,
    worker_uptime_hours:           Math.round((workerUptimeMs / 3600000) * 100) / 100,
    restart_count:                 _restartCount,
    processing_cycles:             _processingCycles,
    failed_cycles:                 _failedCycles,
    worker_run_count:              workerStatus.run_count,
    health_transitions:            _healthTransitions.slice(-20),
    health_transition_count:       _healthTransitions.length,
    average_batch_duration_ms:     _average(_batchDurations),
    average_processing_latency_ms: _average(_processingLatencies),
    worker_running:                workerStatus.worker_running,
    last_error:                    workerStatus.last_error,
    captured_at:                   new Date().toISOString()
  };
}

function resetStabilityCounters() {
  _workerStartedAt = null;
  _restartCount = 0;
  _processingCycles = 0;
  _failedCycles = 0;
  _healthTransitions = [];
  _batchDurations = [];
  _processingLatencies = [];
}

module.exports = {
  markWorkerStarted,
  recordRestart,
  recordCycle,
  recordHealthTransition,
  getStabilitySnapshot,
  resetStabilityCounters,
  LAYER
};
