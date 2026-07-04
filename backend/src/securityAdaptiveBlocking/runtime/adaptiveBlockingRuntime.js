'use strict';

/**
 * SEC-14 — Adaptive Blocking Runtime.
 */

const flags = require('../config/securityAdaptiveBlockingFlags');
const metrics = require('../metrics/adaptiveBlockingMetrics');
const store = require('../store/adaptiveBlockingStore');
const engine = require('../engine/adaptiveBlockingEngine');

let timer = null;
let bootstrapped = false;

function bootstrap() {
  if (!flags.isSecurityAdaptiveBlockingEnabled()) {
    return { ok: true, enabled: false, message: 'SECURITY_ADAPTIVE_BLOCKING=false (shadow)' };
  }

  if (bootstrapped) return { ok: true, enabled: true, message: 'already bootstrapped' };

  bootstrapped = true;
  console.log('[SEC-14] Enterprise Adaptive Blocking activo (observe only — nenhum bloqueio executado)');

  const interval = flags.evaluationIntervalMs();
  timer = setInterval(() => {
    try {
      engine.evaluateAdaptiveBlocking();
    } catch (e) {
      console.warn('[SEC-14_EVAL]', e?.message || e);
    }
  }, interval);
  if (timer.unref) timer.unref();

  engine.evaluateAdaptiveBlocking({ force: true });
  return {
    ok: true,
    enabled: true,
    mode: flags.blockingMode(),
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
  if (!flags.isSecurityAdaptiveBlockingEnabled()) {
    return {
      ok: true,
      phase: 'SEC-14',
      read_only: true,
      enabled: false,
      mode: flags.blockingMode(),
      require_approval: flags.requireApproval(),
      metrics: metrics.getSnapshot(),
      dashboard: null,
      disclaimer: 'SECURITY_ADAPTIVE_BLOCKING=false — reputação e recomendações inactivas'
    };
  }

  const dashboard = store.getLastDashboard() || engine.evaluateAdaptiveBlocking({ force: true });
  return {
    ok: true,
    phase: 'SEC-14',
    read_only: true,
    enabled: true,
    mode: flags.blockingMode(),
    require_approval: flags.requireApproval(),
    metrics: metrics.getSnapshot(),
    dashboard,
    recommendations: store.getRecommendations(20),
    blacklist: store.getAllBlacklistEntries().slice(0, 20),
    disclaimer: 'Adaptive Blocking — recomendações only, auto_execute=false sempre'
  };
}

function buildDashboard(opts = {}) {
  return engine.evaluateAdaptiveBlocking(opts);
}

module.exports = {
  bootstrap,
  shutdown,
  getAuditPayload,
  buildDashboard
};
