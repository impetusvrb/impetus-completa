'use strict';

/**
 * SEC-18 — Runtime Protection Runtime.
 */

const flags = require('../config/securityRuntimeProtectionFlags');
const metrics = require('../metrics/runtimeProtectionMetrics');
const store = require('../store/runtimeProtectionStore');
const engine = require('../engine/runtimeProtectionEngine');

let timer = null;
let bootstrapped = false;

function bootstrap() {
  if (!flags.isSecurityRuntimeProtectionEnabled()) {
    return { ok: true, enabled: false, message: 'SECURITY_RUNTIME_PROTECTION=false (shadow)' };
  }

  if (bootstrapped) return { ok: true, enabled: true, message: 'already bootstrapped' };

  bootstrapped = true;
  console.log('[SEC-18] Runtime Protection Controller activo (observe only — nenhuma execução)');

  const interval = flags.evaluationIntervalMs();
  timer = setInterval(() => {
    try {
      engine.evaluateRuntimeProtection();
    } catch (e) {
      console.warn('[SEC-18_EVAL]', e?.message || e);
    }
  }, interval);
  if (timer.unref) timer.unref();

  engine.evaluateRuntimeProtection({ force: true });
  return {
    ok: true,
    enabled: true,
    mode: flags.runtimeProtectionMode(),
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
  if (!flags.isSecurityRuntimeProtectionEnabled()) {
    return {
      ok: true,
      phase: 'SEC-18',
      read_only: true,
      enabled: false,
      mode: flags.runtimeProtectionMode(),
      require_approval: flags.requireApproval(),
      metrics: metrics.getSnapshot(),
      dashboard: null,
      disclaimer: 'SECURITY_RUNTIME_PROTECTION=false — controlador inactivo'
    };
  }

  const dashboard = store.getLastDashboard() || engine.evaluateRuntimeProtection({ force: true });
  return {
    ok: true,
    phase: 'SEC-18',
    read_only: true,
    enabled: true,
    mode: flags.runtimeProtectionMode(),
    require_approval: flags.requireApproval(),
    metrics: metrics.getSnapshot(),
    dashboard,
    protectionPlans: store.getPlans(20),
    approvals: store.getApprovals(10),
    disclaimer: 'Runtime Protection Controller — planos only, auto_execute=false sempre'
  };
}

function buildDashboard(opts = {}) {
  return engine.evaluateRuntimeProtection(opts);
}

module.exports = {
  bootstrap,
  shutdown,
  getAuditPayload,
  buildDashboard
};
