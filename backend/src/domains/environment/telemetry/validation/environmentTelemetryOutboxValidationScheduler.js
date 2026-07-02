'use strict';

/**
 * CERT-OUTBOX-VALIDATION-01 — Scheduler de comparação e relatório periódico.
 */

const observability = require('../../../../services/observabilityService');
const validation = require('./environmentTelemetryOutboxValidationService');
const outboxMode = require('../environmentTelemetryOutboxMode');

const DEFAULT_MS =
  parseInt(process.env.IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_VALIDATION_INTERVAL_MS || '3600000', 10) ||
  3600000;

let _timer = null;
let _started = false;

function isValidationSchedulerEnabled() {
  const v = String(process.env.IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_VALIDATION_SCHEDULER || 'on')
    .trim()
    .toLowerCase();
  return v !== 'off' && v !== 'false' && v !== '0';
}

function runValidationCycle() {
  const comparison = validation.runComparisonCheck();
  const safety = validation.getSafetyCriteria();
  observability.logEvent('INFO', 'TELEMETRY_OUTBOX_VALIDATION_CYCLE', {
    details: {
      mode: outboxMode.getOutboxMode(),
      comparison_ok: comparison.ok,
      divergence: comparison.divergence,
      consumer_requests: comparison.consumer_requests,
      ready_for_remediation: safety.ready_for_remediation_cert
    }
  });
  return { comparison, safety };
}

function startValidationScheduler() {
  if (_started) return { started: false, reason: 'already_started' };
  if (!isValidationSchedulerEnabled()) return { started: false, reason: 'scheduler_disabled' };

  _started = true;
  const intervalMs = Math.max(60000, DEFAULT_MS);

  _timer = setInterval(() => {
    try {
      runValidationCycle();
    } catch (err) {
      console.warn('[TELEMETRY_OUTBOX_VALIDATION_SCHEDULER]', err?.message || err);
    }
  }, intervalMs);

  if (typeof _timer.unref === 'function') _timer.unref();

  const bootDelay =
    parseInt(process.env.IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_VALIDATION_BOOT_DELAY_MS || '180000', 10) ||
    180000;

  setTimeout(() => {
    try {
      runValidationCycle();
    } catch (err) {
      console.warn('[TELEMETRY_OUTBOX_VALIDATION_BOOT]', err?.message || err);
    }
  }, bootDelay).unref?.();

  return { started: true, interval_ms: intervalMs, boot_delay_ms: bootDelay };
}

function stopValidationScheduler() {
  if (_timer) clearInterval(_timer);
  _timer = null;
  _started = false;
  return { stopped: true };
}

module.exports = {
  isValidationSchedulerEnabled,
  startValidationScheduler,
  stopValidationScheduler,
  runValidationCycle
};
