'use strict';

/**
 * SEC-17 — Exfiltration Detection Runtime.
 */

const flags = require('../config/securityExfiltrationFlags');
const metrics = require('../metrics/exfiltrationMetrics');
const store = require('../store/exfiltrationStore');
const engine = require('../engine/exfiltrationDetectionEngine');

let timer = null;
let bootstrapped = false;

function bootstrap() {
  if (!flags.isSecurityExfiltrationDetectionEnabled()) {
    return { ok: true, enabled: false, message: 'SECURITY_EXFILTRATION_DETECTION=false (shadow)' };
  }

  if (bootstrapped) return { ok: true, enabled: true, message: 'already bootstrapped' };

  bootstrapped = true;
  console.log('[SEC-17] Exfiltration Detection activo (observe only — nenhum bloqueio de download)');

  const interval = flags.evaluationIntervalMs();
  timer = setInterval(() => {
    try {
      engine.evaluateExfiltrationDetection();
    } catch (e) {
      console.warn('[SEC-17_EVAL]', e?.message || e);
    }
  }, interval);
  if (timer.unref) timer.unref();

  engine.evaluateExfiltrationDetection({ force: true });
  return {
    ok: true,
    enabled: true,
    mode: flags.dataProtectionMode(),
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
  if (!flags.isSecurityExfiltrationDetectionEnabled()) {
    return {
      ok: true,
      phase: 'SEC-17',
      read_only: true,
      enabled: false,
      mode: flags.dataProtectionMode(),
      require_approval: flags.requireApproval(),
      metrics: metrics.getSnapshot(),
      dashboard: null,
      disclaimer: 'SECURITY_EXFILTRATION_DETECTION=false — detecção de exfiltração inactiva'
    };
  }

  const dashboard = store.getLastDashboard() || engine.evaluateExfiltrationDetection({ force: true });
  return {
    ok: true,
    phase: 'SEC-17',
    read_only: true,
    enabled: true,
    mode: flags.dataProtectionMode(),
    require_approval: flags.requireApproval(),
    metrics: metrics.getSnapshot(),
    dashboard,
    protectionPlans: store.getPlans(20),
    timeline: store.getTimeline().slice(0, 30),
    disclaimer: 'Exfiltration Detection — consultivo only, auto_execute=false sempre'
  };
}

function buildDashboard(opts = {}) {
  return engine.evaluateExfiltrationDetection(opts);
}

module.exports = {
  bootstrap,
  shutdown,
  getAuditPayload,
  buildDashboard
};
