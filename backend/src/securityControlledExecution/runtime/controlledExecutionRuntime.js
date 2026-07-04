'use strict';

/**
 * SEC-13 — Controlled Execution Runtime.
 */

const flags = require('../config/securityControlledExecutionFlags');
const metrics = require('../metrics/controlledExecutionMetrics');
const engine = require('../engine/controlledExecutionEngine');
const journal = require('../engine/executionJournalService');

let timer = null;
let bootstrapped = false;
let lastDashboard = null;

function bootstrap() {
  if (!flags.isSecurityControlledExecutionEnabled()) {
    return { ok: true, enabled: false, message: 'SECURITY_CONTROLLED_EXECUTION=false (shadow)' };
  }

  if (bootstrapped) return { ok: true, enabled: true, message: 'already bootstrapped' };

  bootstrapped = true;
  console.log('[SEC-13] Controlled Execution activo (LOW risk auto only — manual approval for rest)');

  const interval = flags.evaluationIntervalMs();
  timer = setInterval(() => {
    try {
      lastDashboard = engine.evaluateExecution();
    } catch (e) {
      console.warn('[SEC-13_EVAL]', e?.message || e);
    }
  }, interval);
  if (timer.unref) timer.unref();

  lastDashboard = engine.evaluateExecution({ force: true });
  return {
    ok: true,
    enabled: true,
    autoLevel: flags.autoExecutionLevel(),
    requireApproval: flags.manualApprovalRequired(),
    intervalMs: interval
  };
}

function shutdown() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  bootstrapped = false;
  lastDashboard = null;
}

function getAuditPayload() {
  if (!flags.isSecurityControlledExecutionEnabled()) {
    return {
      ok: true,
      phase: 'SEC-13',
      read_only: true,
      enabled: false,
      auto_execution_level: flags.autoExecutionLevel(),
      manual_approval_required: flags.manualApprovalRequired(),
      metrics: metrics.getSnapshot(),
      dashboard: null,
      disclaimer: 'SECURITY_CONTROLLED_EXECUTION=false'
    };
  }

  const dashboard = lastDashboard || engine.evaluateExecution({ force: true });
  return {
    ok: true,
    phase: 'SEC-13',
    read_only: true,
    enabled: true,
    auto_execution_level: flags.autoExecutionLevel(),
    manual_approval_required: flags.manualApprovalRequired(),
    journal: journal.getHistory(10),
    internal_incidents: journal.getInternalIncidents(),
    metrics: metrics.getSnapshot(),
    dashboard,
    disclaimer: 'Controlled execution — AUTO_EXECUTABLE LOW only'
  };
}

function buildDashboard(opts = {}) {
  const dash = engine.evaluateExecution(opts);
  if (dash) lastDashboard = dash;
  return dash;
}

module.exports = { bootstrap, shutdown, getAuditPayload, buildDashboard, rollbackExecution: engine.rollbackExecution };
