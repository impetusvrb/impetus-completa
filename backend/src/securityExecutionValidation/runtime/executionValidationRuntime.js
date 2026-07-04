'use strict';

/**
 * SEC-12 — Execution Validation Runtime.
 */

const flags = require('../config/securityExecutionValidationFlags');
const metrics = require('../metrics/executionValidationMetrics');
const store = require('../store/executionValidationStore');
const engine = require('../engine/executionValidationEngine');

let timer = null;
let bootstrapped = false;

function bootstrap() {
  if (!flags.isSecurityExecutionValidationEnabled()) {
    return { ok: true, enabled: false, message: 'SECURITY_EXECUTION_VALIDATION=false (shadow)' };
  }

  if (!flags.dryRunOnly()) {
    console.warn('[SEC-12] SECURITY_DRY_RUN_ONLY must be true — refusing bootstrap');
    return { ok: false, enabled: false, message: 'SECURITY_DRY_RUN_ONLY must remain true in SEC-12' };
  }

  if (bootstrapped) return { ok: true, enabled: true, message: 'already bootstrapped' };

  bootstrapped = true;
  console.log('[SEC-12] Execution Validation Layer activo (dry-run only — no execution)');

  const interval = flags.evaluationIntervalMs();
  timer = setInterval(() => {
    try {
      engine.evaluateValidation();
    } catch (e) {
      console.warn('[SEC-12_EVAL]', e?.message || e);
    }
  }, interval);
  if (timer.unref) timer.unref();

  engine.evaluateValidation({ force: true });
  return { ok: true, enabled: true, dryRunOnly: true, intervalMs: interval };
}

function shutdown() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  bootstrapped = false;
}

function getAuditPayload() {
  if (!flags.isSecurityExecutionValidationEnabled()) {
    return {
      ok: true,
      phase: 'SEC-12',
      read_only: true,
      enabled: false,
      dry_run_only: flags.dryRunOnly(),
      metrics: metrics.getSnapshot(),
      dashboard: null,
      disclaimer: 'SECURITY_EXECUTION_VALIDATION=false — SEC-13 requer validação prévia'
    };
  }

  const dashboard = store.getLastDashboard() || engine.evaluateValidation({ force: true });
  return {
    ok: true,
    phase: 'SEC-12',
    read_only: true,
    enabled: true,
    dry_run_only: flags.dryRunOnly(),
    last_evaluation: store.getLastEvaluation(),
    validation_history: store.getValidationHistory(10),
    dry_run_history: store.getDryRunHistory(10),
    metrics: metrics.getSnapshot(),
    dashboard,
    disclaimer: 'Execution Validation — dry-run only, SEC-11 never executes directly'
  };
}

function buildDashboard(opts = {}) {
  return engine.evaluateValidation(opts);
}

module.exports = { bootstrap, shutdown, getAuditPayload, buildDashboard };
