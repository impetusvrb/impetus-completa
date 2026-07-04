'use strict';

const flags = require('../config/securityOperationalPromotionFlags');
const dashboard = require('../engine/promotionOperationalDashboard');
const store = require('../store/operationalPromotionStore');
const metrics = require('../metrics/securityOperationalMonitor');

let timer = null;
let bootstrapped = false;

function bootstrap() {
  if (!flags.isSecurityOperationalPromotionEnabled()) {
    return { ok: true, enabled: false, message: 'SECURITY_OPERATIONAL_PROMOTION=false' };
  }
  if (bootstrapped) return { ok: true, enabled: true };
  bootstrapped = true;
  console.log('[SEC-13A] Operational Promotion & Validation activo (controlled — no auto-activation)');

  const interval = flags.evalIntervalMs();
  timer = setInterval(() => {
    try {
      dashboard.buildDashboard({ force: true });
    } catch (e) {
      console.warn('[SEC-13A_EVAL]', e?.message || e);
    }
  }, interval);
  if (timer.unref) timer.unref();

  dashboard.buildDashboard({ force: true });
  return { ok: true, enabled: true, mode: flags.promotionMode(), intervalMs: interval };
}

function shutdown() {
  if (timer) clearInterval(timer);
  timer = null;
  bootstrapped = false;
}

function getAuditPayload() {
  if (!flags.isSecurityOperationalPromotionEnabled()) {
    return {
      ok: true,
      phase: 'SEC-13A',
      read_only: true,
      enabled: false,
      promotion_mode: flags.promotionMode(),
      metrics: metrics.getSnapshot(),
      dashboard: null,
      disclaimer: 'Promoção operacional SEC-01→13 — activar SECURITY_OPERATIONAL_PROMOTION após SEC-09 plano'
    };
  }
  const dash = store.getLastDashboard() || dashboard.buildDashboard({ force: true });
  return {
    ok: true,
    phase: 'SEC-13A',
    read_only: true,
    enabled: true,
    promotion_mode: flags.promotionMode(),
    validation: store.getLastValidation(),
    reports: store.getReports(10),
    metrics: metrics.getSnapshot(),
    dashboard: dash,
    disclaimer: 'Operational promotion — uma activação por vez, rollback independente, SEC-14 após ONLINE READY'
  };
}

module.exports = { bootstrap, shutdown, getAuditPayload };
