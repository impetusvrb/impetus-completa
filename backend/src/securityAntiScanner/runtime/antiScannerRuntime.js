'use strict';

/**
 * SEC-15 — Anti-Scanner Runtime.
 */

const flags = require('../config/securityAntiScannerFlags');
const metrics = require('../metrics/antiScannerMetrics');
const store = require('../store/antiScannerStore');
const engine = require('../engine/antiScannerEngine');

let timer = null;
let bootstrapped = false;

function bootstrap() {
  if (!flags.isSecurityAntiScannerEnabled()) {
    return { ok: true, enabled: false, message: 'SECURITY_ANTI_SCANNER=false (shadow)' };
  }

  if (bootstrapped) return { ok: true, enabled: true, message: 'already bootstrapped' };

  bootstrapped = true;
  console.log('[SEC-15] Anti-Scanner + Anti-Enumeration activo (observe only — nenhuma alteração HTTP)');

  const interval = flags.evaluationIntervalMs();
  timer = setInterval(() => {
    try {
      engine.evaluateAntiScanner();
    } catch (e) {
      console.warn('[SEC-15_EVAL]', e?.message || e);
    }
  }, interval);
  if (timer.unref) timer.unref();

  engine.evaluateAntiScanner({ force: true });
  return {
    ok: true,
    enabled: true,
    mode: flags.surfaceProtectionMode(),
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
  if (!flags.isSecurityAntiScannerEnabled()) {
    return {
      ok: true,
      phase: 'SEC-15',
      read_only: true,
      enabled: false,
      mode: flags.surfaceProtectionMode(),
      require_approval: flags.requireApproval(),
      metrics: metrics.getSnapshot(),
      dashboard: null,
      disclaimer: 'SECURITY_ANTI_SCANNER=false — protecção de superfície inactiva'
    };
  }

  const dashboard = store.getLastDashboard() || engine.evaluateAntiScanner({ force: true });
  return {
    ok: true,
    phase: 'SEC-15',
    read_only: true,
    enabled: true,
    mode: flags.surfaceProtectionMode(),
    require_approval: flags.requireApproval(),
    metrics: metrics.getSnapshot(),
    dashboard,
    surfacePlans: store.getSurfacePlans(20),
    disclaimer: 'Anti-Scanner — planos consultivos only, auto_execute=false sempre'
  };
}

function buildDashboard(opts = {}) {
  return engine.evaluateAntiScanner(opts);
}

module.exports = {
  bootstrap,
  shutdown,
  getAuditPayload,
  buildDashboard
};
