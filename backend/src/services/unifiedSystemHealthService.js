'use strict';

/**
 * Painel de saúde consolidado (métricas agregadas + auditorias recentes).
 * Log [UNIFIED_SYSTEM_HEALTH_SNAPSHOT] apenas com UNIFIED_SYSTEM_HEALTH=true.
 */

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * @param {object} params
 * @param {object|null} [params.metrics] — getMetricsSnapshot
 * @param {object[]} [params.audits] — registos unifiedDecisionAuditService
 * @param {string|null|undefined} [params.companyId]
 */
function computeSystemHealth({ metrics, audits, companyId }) {
  const m = metrics && typeof metrics === 'object' ? metrics : {};
  const fr = Number(m.fallback_rate);
  const fallback_rate = Number.isFinite(fr) ? Math.round(fr * 1000) / 1000 : 0;
  const pu = m.pipeline_usage && typeof m.pipeline_usage === 'object' ? m.pipeline_usage : {};
  const g = Number(pu.gpt) || 0;
  const c = Number(pu.cognitive) || 0;
  const tot = g + c;
  const cognitive_usage = tot > 0 ? Math.round((c / tot) * 1000) / 1000 : 0;

  const list = Array.isArray(audits) ? audits : [];
  const recent = list.slice(-120);
  let badSignals = 0;
  let denom = 0;
  for (const a of recent) {
    if (!a || typeof a !== 'object') continue;
    denom += 1;
    if (a.audit_ok === false || a.bad_high_score_outcome || a.issues?.badHighScore) badSignals += 1;
  }
  const decision_quality =
    denom > 0 ? Math.round(1000 * (1 - badSignals / denom)) / 1000 : 1;

  const avgScore = Number(m.avg_score);
  const issueRate = denom > 0 ? recent.filter((x) => x && x.audit_ok === false).length / denom : 0;
  const base = Number.isFinite(avgScore) ? avgScore : 0.55;
  const stability_score = Math.round(
    clamp01(base * (1 - issueRate * 0.45) * (1 - fallback_rate * 0.35)) * 1000
  ) / 1000;

  let validation = {
    error_rate: 0,
    high_confidence_failure_rate: 0,
    total_validated: 0
  };
  try {
    const { getValidationStats } = require('./unifiedDecisionValidationService');
    const vs = getValidationStats(companyId);
    validation = {
      error_rate: vs.error_rate ?? 0,
      high_confidence_failure_rate: vs.high_confidence_failure_rate ?? 0,
      total_validated: vs.total_validated ?? 0
    };
  } catch (_val) {}

  let system_health = 'good';
  if (fallback_rate > 0.38 || decision_quality < 0.5 || stability_score < 0.35) {
    system_health = 'critical';
  } else if (fallback_rate > 0.22 || decision_quality < 0.72 || stability_score < 0.55) {
    system_health = 'warning';
  }

  const out = {
    system_health,
    decision_quality,
    fallback_rate,
    cognitive_usage,
    stability_score,
    validation,
    company_key:
      companyId != null && String(companyId).trim() !== '' ? String(companyId).trim() : '_global'
  };

  try {
    const { checkAndEmitHealthAlerts } = require('./unifiedHealthAlertService');
    checkAndEmitHealthAlerts(out, m);
  } catch (_alert) {}

  if (process.env.UNIFIED_SYSTEM_HEALTH === 'true') {
    try {
      console.info('[UNIFIED_SYSTEM_HEALTH_SNAPSHOT]', JSON.stringify(out));
    } catch (_e) {}
  }

  return out;
}

module.exports = {
  computeSystemHealth
};
