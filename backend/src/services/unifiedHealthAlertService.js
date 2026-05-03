'use strict';

/**
 * Alertas internos por degradação de saúde cognitiva (só log + antispam em memória).
 * Não dispara ações, notificações a utilizadores nem altera decisões.
 */

const COOLDOWN_MS = Math.max(
  60000,
  parseInt(process.env.UNIFIED_HEALTH_ALERT_COOLDOWN_MS || String(10 * 60 * 1000), 10)
);

const LAT_HIGH_MS = Math.max(
  2000,
  parseInt(process.env.UNIFIED_HEALTH_ALERT_LATENCY_MS || '8000', 10)
);

/** @type {Map<string, Map<string, number>>} company_key -> alert_type -> last_emit_ts */
const lastEmitByCompany = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

function alertsEnabled() {
  return process.env.UNIFIED_HEALTH_ALERTS !== 'false';
}

function latencyHigh(metrics) {
  const al = metrics && typeof metrics === 'object' ? metrics.avg_latency : null;
  if (!al || typeof al !== 'object') return false;
  const g = Number(al.gpt);
  const c = Number(al.cognitive);
  const mx = Math.max(
    Number.isFinite(g) ? g : 0,
    Number.isFinite(c) ? c : 0
  );
  return mx >= LAT_HIGH_MS;
}

/**
 * @param {object} health — saída de computeSystemHealth
 * @param {object|null} [metrics] — métricas agregadas (latência); opcional
 */
function checkAndEmitHealthAlerts(health, metrics) {
  if (!alertsEnabled()) return;

  const h = health && typeof health === 'object' ? health : {};
  const companyKey = h.company_key != null ? cidKey(h.company_key) : '_global';
  const fr = Number(h.fallback_rate);
  const fallback_rate = Number.isFinite(fr) ? fr : 0;
  const ss = Number(h.stability_score);
  const stability_score = Number.isFinite(ss) ? ss : 0;
  const m = metrics && typeof metrics === 'object' ? metrics : null;

  const critical = fallback_rate > 0.25 || stability_score < 0.4;
  const warnLevel =
    !critical && (fallback_rate > 0.15 || latencyHigh(m || {}));

  let type = null;
  let message = null;
  if (critical) {
    type = 'SYSTEM_CRITICAL';
    message = 'Sistema cognitivo em degradação crítica';
  } else if (warnLevel) {
    type = 'SYSTEM_WARNING';
    message = 'Indicadores de saúde cognitiva requerem atenção';
  }

  if (!type) return;

  if (!lastEmitByCompany.has(companyKey)) lastEmitByCompany.set(companyKey, new Map());
  const inner = lastEmitByCompany.get(companyKey);
  const last = inner.get(type) || 0;
  const now = Date.now();
  if (now - last < COOLDOWN_MS) return;
  inner.set(type, now);

  try {
    console.warn(
      '[UNIFIED_HEALTH_ALERT]',
      JSON.stringify({
        type,
        message,
        company_key: companyKey,
        fallback_rate,
        stability_score,
        latency_high: latencyHigh(m || {})
      })
    );
  } catch (_e) {}
}

module.exports = {
  checkAndEmitHealthAlerts,
  __test: { lastEmitByCompany, COOLDOWN_MS }
};
