'use strict';

/**
 * SEC-11 — Adaptive Protection Runtime.
 */

const flags = require('../config/securityAdaptiveProtectionFlags');
const metrics = require('../metrics/adaptiveProtectionMetrics');
const store = require('../store/adaptiveProtectionStore');
const engine = require('../engine/adaptiveProtectionEngine');
const approval = require('../engine/administratorApprovalService');

let timer = null;
let bootstrapped = false;

function bootstrap() {
  if (!flags.isSecurityAdaptiveProtectionEnabled()) {
    return { ok: true, enabled: false, message: 'SECURITY_ADAPTIVE_PROTECTION=false (shadow)' };
  }

  if (bootstrapped) return { ok: true, enabled: true, message: 'already bootstrapped' };

  bootstrapped = true;
  console.log('[SEC-11] Enterprise Adaptive Protection activo (plan only — approval required)');

  const interval = flags.evaluationIntervalMs();
  timer = setInterval(() => {
    try {
      engine.evaluateProtection();
    } catch (e) {
      console.warn('[SEC-11_EVAL]', e?.message || e);
    }
  }, interval);
  if (timer.unref) timer.unref();

  engine.evaluateProtection({ force: true });
  return {
    ok: true,
    enabled: true,
    mode: flags.protectionMode(),
    requireApproval: flags.requireApproval(),
    intervalMs: interval
  };
}

function shutdown() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  bootstrapped = false;
}

function getAuditPayload() {
  if (!flags.isSecurityAdaptiveProtectionEnabled()) {
    return {
      ok: true,
      phase: 'SEC-11',
      read_only: true,
      enabled: false,
      mode: flags.protectionMode(),
      require_approval: flags.requireApproval(),
      current_profile: store.getCurrentProfile(),
      metrics: metrics.getSnapshot(),
      dashboard: null,
      disclaimer: 'SECURITY_ADAPTIVE_PROTECTION=false — planos only, SEC-12 para execução'
    };
  }

  const dashboard = store.getLastDashboard() || engine.evaluateProtection({ force: true });
  return {
    ok: true,
    phase: 'SEC-11',
    read_only: true,
    enabled: true,
    mode: flags.protectionMode(),
    require_approval: flags.requireApproval(),
    last_evaluation: store.getLastEvaluation(),
    approval_log: store.getApprovalLog(10),
    plan_history: store.getPlanHistory(10),
    metrics: metrics.getSnapshot(),
    dashboard,
    disclaimer: 'Adaptive Protection — recommended_plan only, nenhuma execução automática'
  };
}

function buildDashboard(opts = {}) {
  return engine.evaluateProtection(opts);
}

function requestApproval(planId, approver, reason, type = 'single') {
  const plans = store.getPlanHistory(50);
  const plan = plans.find((p) => p.planId === planId);
  if (!plan) return null;
  const req = approval.createApprovalRequest(plan, approver);
  return approval.registerApproval(req, approver, reason, type);
}

module.exports = {
  bootstrap,
  shutdown,
  getAuditPayload,
  buildDashboard,
  requestApproval
};
