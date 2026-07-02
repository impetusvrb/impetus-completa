'use strict';

/**
 * CERT-EVENT-RETENTION-01 — Scheduler dedicado de retenção do Event Backbone.
 * Execução diária (configurável), shadow por defeito, não bloqueia produção.
 */

const { v4: uuidv4 } = require('uuid');
const observability = require('../../services/observabilityService');
const retentionEngine = require('./eventRetentionEngine');

const DEFAULT_MS =
  parseInt(process.env.IMPETUS_EVENT_RETENTION_INTERVAL_MS || '86400000', 10) || 86400000;

let _timer = null;
let _started = false;
let _lastRun = null;
let _lastResult = null;

function isRetentionSchedulerEnabled() {
  const v = String(process.env.IMPETUS_EVENT_RETENTION_SCHEDULER || 'shadow').trim().toLowerCase();
  return v !== 'off' && v !== 'false' && v !== '0';
}

function schedulerMode() {
  const v = String(process.env.IMPETUS_EVENT_RETENTION_SCHEDULER || 'shadow').trim().toLowerCase();
  return ['shadow', 'active'].includes(v) ? v : 'shadow';
}

async function runScheduledRetention(opts = {}) {
  const runId = opts.run_id || uuidv4();
  const started = Date.now();
  try {
    const result = await retentionEngine.runRetentionCycle({
      run_id: runId,
      archive_batch_size: opts.archive_batch_size,
      compress: opts.compress !== false
    });
    _lastRun = new Date().toISOString();
    _lastResult = { ...result, scheduler: schedulerMode() };
    observability.logEvent('INFO', 'EVENT_RETENTION_SCHEDULER_RUN', {
      trace_id: runId,
      details: {
        mode: schedulerMode(),
        policies_applied: result.policies_applied,
        transitions: (result.transitions || []).length,
        duration_ms: Date.now() - started,
        errors: (result.errors || []).length
      }
    });
    return _lastResult;
  } catch (err) {
    observability.incrementMetric('event_retention_failed');
    observability.logEvent('ERROR', 'EVENT_RETENTION_SCHEDULER_FAILED', {
      trace_id: runId,
      details: { error: err?.message || String(err) }
    });
    throw err;
  }
}

function startRetentionScheduler() {
  if (_started) return { started: false, reason: 'already_started' };
  if (!isRetentionSchedulerEnabled()) {
    return { started: false, reason: 'scheduler_disabled' };
  }

  _started = true;
  const intervalMs = Math.max(60000, DEFAULT_MS);

  _timer = setInterval(() => {
    runScheduledRetention().catch((err) => {
      console.warn('[EVENT_RETENTION_SCHEDULER]', err?.message || err);
    });
  }, intervalMs);

  if (typeof _timer.unref === 'function') _timer.unref();

  // Primeira execução adiada (não bloqueia boot)
  const bootDelay = parseInt(process.env.IMPETUS_EVENT_RETENTION_BOOT_DELAY_MS || '120000', 10) || 120000;
  setTimeout(() => {
    runScheduledRetention().catch((err) => {
      console.warn('[EVENT_RETENTION_SCHEDULER_BOOT]', err?.message || err);
    });
  }, bootDelay).unref?.();

  return {
    started: true,
    mode: schedulerMode(),
    interval_ms: intervalMs,
    boot_delay_ms: bootDelay
  };
}

function stopRetentionScheduler() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
  _started = false;
  return { stopped: true };
}

function getSchedulerStatus() {
  return {
    enabled: isRetentionSchedulerEnabled(),
    mode: schedulerMode(),
    started: _started,
    interval_ms: DEFAULT_MS,
    last_run: _lastRun,
    last_result_summary: _lastResult
      ? {
          run_id: _lastResult.run_id,
          mode: _lastResult.mode,
          policies_applied: _lastResult.policies_applied,
          transitions: (_lastResult.transitions || []).length,
          duration_ms: _lastResult.duration_ms
        }
      : null
  };
}

module.exports = {
  isRetentionSchedulerEnabled,
  schedulerMode,
  startRetentionScheduler,
  stopRetentionScheduler,
  runScheduledRetention,
  getSchedulerStatus
};
