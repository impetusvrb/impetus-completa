'use strict';

/**
 * SEC-10 — Active Defense Runtime (bootstrap + audit).
 */

const flags = require('../config/securityActiveDefenseFlags');
const metrics = require('../metrics/activeDefenseMetrics');
const store = require('../store/activeDefenseStore');
const engine = require('../engine/activeDefenseEngine');

let timer = null;
let bootstrapped = false;

function bootstrap() {
  if (!flags.isSecurityActiveDefenseEnabled()) {
    return { ok: true, enabled: false, message: 'SECURITY_ACTIVE_DEFENSE=false (shadow)' };
  }

  if (bootstrapped) {
    return { ok: true, enabled: true, message: 'already bootstrapped' };
  }

  bootstrapped = true;
  console.log('[SEC-10] Enterprise Active Defense activo (consultative only — no auto-execute)');

  const interval = flags.evaluationIntervalMs();
  timer = setInterval(() => {
    try {
      engine.evaluateDefense();
    } catch (e) {
      console.warn('[SEC-10_EVAL]', e?.message || e);
    }
  }, interval);
  if (timer.unref) timer.unref();

  engine.evaluateDefense({ force: true });

  return {
    ok: true,
    enabled: true,
    mode: flags.activeDefenseMode(),
    maxLevel: flags.maxDefenseLevel(),
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
  if (!flags.isSecurityActiveDefenseEnabled()) {
    return {
      ok: true,
      phase: 'SEC-10',
      read_only: true,
      enabled: false,
      mode: flags.activeDefenseMode(),
      max_level: flags.maxDefenseLevel(),
      current_security_mode: store.getCurrentMode(),
      metrics: metrics.getSnapshot(),
      dashboard: null,
      disclaimer: 'SECURITY_ACTIVE_DEFENSE=false — activar via SEC-09 promotion plan'
    };
  }
  const dashboard = store.getLastDashboard() || engine.evaluateDefense({ force: true });
  return {
    ok: true,
    phase: 'SEC-10',
    read_only: true,
    enabled: flags.isSecurityActiveDefenseEnabled(),
    mode: flags.activeDefenseMode(),
    max_level: flags.maxDefenseLevel(),
    current_security_mode: store.getCurrentMode(),
    last_evaluation: store.getLastEvaluation(),
    metrics: metrics.getSnapshot(),
    dashboard: dashboard || null,
    campaigns: store.getCampaigns(),
    recommendation_history: store.getRecommendationHistory(20),
    disclaimer: 'Active Defense consultivo — nenhuma acção destructiva ou bloqueio automático'
  };
}

function buildDashboard(opts = {}) {
  return engine.evaluateDefense(opts);
}

module.exports = {
  bootstrap,
  shutdown,
  getAuditPayload,
  buildDashboard
};
