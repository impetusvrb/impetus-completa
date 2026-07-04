'use strict';

/**
 * SEC-19 — Runtime da certificação operacional.
 */

const flags = require('../config/securityOperationalCertificationFlags');
const metrics = require('../metrics/operationalCertificationMetrics');
const store = require('../store/operationalCertificationStore');
const engine = require('../engine/certificationEngine');

let timer = null;
let bootstrapped = false;

function bootstrap() {
  if (!flags.isSecurityOperationalCertificationEnabled()) {
    return {
      ok: true,
      enabled: false,
      message: 'SECURITY_OPERATIONAL_CERTIFICATION=false (shadow)'
    };
  }

  if (bootstrapped) {
    return { ok: true, enabled: true, message: 'already bootstrapped' };
  }

  bootstrapped = true;
  console.log('[SEC-19] Operational Certification activo (simulação audit-only — nenhuma nova protecção)');

  const interval = flags.evaluationIntervalMs();
  timer = setInterval(() => {
    try {
      engine.runOperationalCertification({ skipComposite: true });
    } catch (e) {
      console.warn('[SEC-19_EVAL]', e?.message || e);
    }
  }, interval);
  if (timer.unref) timer.unref();

  engine.runOperationalCertification({ force: true });
  return {
    ok: true,
    enabled: true,
    mode: flags.certificationMode(),
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
  if (!flags.isSecurityOperationalCertificationEnabled()) {
    return {
      ok: true,
      phase: 'SEC-19',
      read_only: true,
      enabled: false,
      mode: flags.certificationMode(),
      metrics: metrics.getSnapshot(),
      dashboard: null,
      disclaimer: 'SECURITY_OPERATIONAL_CERTIFICATION=false — certificação inactiva'
    };
  }

  const dashboard =
    store.getLastDashboard() ||
    engine.runOperationalCertification({ skipComposite: false });

  return {
    ok: true,
    phase: 'SEC-19',
    read_only: true,
    enabled: true,
    mode: flags.certificationMode(),
    metrics: metrics.getSnapshot(),
    dashboard,
    attackResults: store.getAttackResults(20),
    stressResults: store.getStressResults(10),
    readiness: store.getReadinessSnapshot(),
    certification: store.getLastCertification(),
    disclaimer: 'SEC-19 — certificação operacional por simulação; módulos SEC-01→18 inalterados'
  };
}

function buildDashboard(opts = {}) {
  return engine.buildDashboard(opts);
}

module.exports = {
  bootstrap,
  shutdown,
  getAuditPayload,
  buildDashboard
};
