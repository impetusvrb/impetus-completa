'use strict';

/**
 * SEC-16 — Threat Deception Runtime.
 */

const flags = require('../config/securityThreatDeceptionFlags');
const metrics = require('../metrics/threatDeceptionMetrics');
const store = require('../store/threatDeceptionStore');
const engine = require('../engine/threatDeceptionEngine');

let timer = null;
let bootstrapped = false;

function bootstrap() {
  if (!flags.isSecurityThreatDeceptionEnabled()) {
    return { ok: true, enabled: false, message: 'SECURITY_THREAT_DECEPTION=false (shadow)' };
  }

  if (bootstrapped) return { ok: true, enabled: true, message: 'already bootstrapped' };

  bootstrapped = true;
  console.log('[SEC-16] Threat Deception Framework activo (observe only — nenhum honeypot exposto)');

  const interval = flags.evaluationIntervalMs();
  timer = setInterval(() => {
    try {
      engine.evaluateThreatDeception();
    } catch (e) {
      console.warn('[SEC-16_EVAL]', e?.message || e);
    }
  }, interval);
  if (timer.unref) timer.unref();

  engine.evaluateThreatDeception({ force: true });
  return {
    ok: true,
    enabled: true,
    mode: flags.deceptionMode(),
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
  if (!flags.isSecurityThreatDeceptionEnabled()) {
    return {
      ok: true,
      phase: 'SEC-16',
      read_only: true,
      enabled: false,
      mode: flags.deceptionMode(),
      require_approval: flags.requireApproval(),
      metrics: metrics.getSnapshot(),
      dashboard: null,
      disclaimer: 'SECURITY_THREAT_DECEPTION=false — decepção inactiva'
    };
  }

  const dashboard = store.getLastDashboard() || engine.evaluateThreatDeception({ force: true });
  return {
    ok: true,
    phase: 'SEC-16',
    read_only: true,
    enabled: true,
    mode: flags.deceptionMode(),
    require_approval: flags.requireApproval(),
    metrics: metrics.getSnapshot(),
    dashboard,
    deceptionPlans: store.getPlans(20),
    disclaimer: 'Threat Deception — planos certificados only, auto_execute=false sempre'
  };
}

function buildDashboard(opts = {}) {
  return engine.evaluateThreatDeception(opts);
}

module.exports = {
  bootstrap,
  shutdown,
  getAuditPayload,
  buildDashboard
};
