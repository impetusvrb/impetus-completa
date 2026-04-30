'use strict';

/**
 * Compara snapshot atual de métricas com último snapshot por empresa (memória de processo).
 * Deteta degradação de serviço sem side-effects externos.
 */

/** @type {Map<string, { composite_latency: number, avg_score: number, fallback_rate: number, ts: number }>} */
const lastByCompany = new Map();

/** @type {Map<string, number>} companyId → epoch ms até quando bloquear tríade */
const triadCooldownUntil = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

function compositeLatency(metrics) {
  const m = metrics && typeof metrics === 'object' ? metrics : {};
  const g = Number(m.avg_latency?.gpt) || 0;
  const c = Number(m.avg_latency?.cognitive) || 0;
  if (g > 0 && c > 0) return (g + c) / 2;
  return Math.max(g, c);
}

function maxSeverity(a, b) {
  const rank = { low: 1, medium: 2, high: 3 };
  return rank[b] > rank[a] ? b : a;
}

/**
 * @param {object|null} metrics — saída de getMetricsSnapshot
 * @param {string|null|undefined} companyId
 * @returns {{ degraded: boolean, severity: 'low'|'medium'|'high', reasons: string[] }}
 */
function detectDegradation(metrics, companyId) {
  const reasons = [];
  let degraded = false;
  let severity = 'low';

  const m = metrics && typeof metrics === 'object' ? metrics : {};
  const fr = Number(m.fallback_rate);
  if (Number.isFinite(fr) && fr > 0.2) {
    degraded = true;
    severity = maxSeverity(severity, 'medium');
    reasons.push('fallback_rate_high');
  }

  const samples = Number(m.total_decisions) || 0;
  const compNow = compositeLatency(m);
  const k = cidKey(companyId);
  const prev = lastByCompany.get(k);
  const scoreDropThr =
    parseFloat(process.env.UNIFIED_DEGRADATION_SCORE_DROP || '0.08') || 0.08;
  const latGrowthThr =
    parseFloat(process.env.UNIFIED_DEGRADATION_LATENCY_GROWTH || '0.3') || 0.3;

  if (prev && samples >= 4 && Number.isFinite(prev.avg_score) && Number.isFinite(m.avg_score)) {
    if (prev.avg_score - Number(m.avg_score) > scoreDropThr) {
      degraded = true;
      severity = maxSeverity(severity, 'medium');
      reasons.push('avg_score_falling');
    }
  }

  if (prev && prev.composite_latency > 50 && compNow > 0) {
    const ratio = compNow / prev.composite_latency;
    if (ratio > 1 + latGrowthThr) {
      degraded = true;
      severity = maxSeverity(severity, ratio > 1.55 ? 'high' : 'medium');
      reasons.push('latency_increasing');
    }
  }

  lastByCompany.set(k, {
    composite_latency: compNow > 0 ? compNow : prev?.composite_latency || 0,
    avg_score: Number.isFinite(Number(m.avg_score)) ? Number(m.avg_score) : prev?.avg_score ?? 0,
    fallback_rate: Number.isFinite(fr) ? fr : prev?.fallback_rate ?? 0,
    ts: Date.now()
  });

  return {
    degraded,
    severity: degraded ? severity : 'low',
    reasons
  };
}

/**
 * Resposta estrutural à degradação — só metadados e bloqueio temporário em memória.
 * @param {{ degraded: boolean, severity: string, reasons?: string[] }} degradation
 * @param {string|null|undefined} companyId
 */
function triggerDegradationResponse(degradation, companyId) {
  const empty = {
    threshold_delta: 0,
    block_triad_until: 0,
    degraded_mode: false,
    reasons: []
  };
  if (process.env.UNIFIED_DEGRADATION_RESPONSE !== 'true') {
    return empty;
  }
  const d = degradation && degradation.degraded ? degradation : null;
  if (!d) return empty;

  let threshold_delta = 0;
  let block_ms = 0;
  if (d.severity === 'high') {
    threshold_delta = 0.12;
    block_ms = 240_000;
  } else if (d.severity === 'medium') {
    threshold_delta = 0.08;
    block_ms = 120_000;
  } else {
    threshold_delta = 0.05;
    block_ms = 60_000;
  }

  const k = cidKey(companyId);
  const until = Date.now() + block_ms;
  triadCooldownUntil.set(k, until);

  const out = {
    threshold_delta,
    block_triad_until: until,
    degraded_mode: true,
    reasons: Array.isArray(d.reasons) ? d.reasons : []
  };
  try {
    console.warn('[UNIFIED_DEGRADATION_ACTION]', JSON.stringify(out));
  } catch (_e) {}
  return out;
}

/**
 * @param {string|null|undefined} companyId
 * @returns {boolean}
 */
function isTriadCooldownActive(companyId) {
  const k = cidKey(companyId);
  const u = triadCooldownUntil.get(k);
  if (u == null) return false;
  if (Date.now() >= u) {
    triadCooldownUntil.delete(k);
    return false;
  }
  return true;
}

module.exports = {
  detectDegradation,
  triggerDegradationResponse,
  isTriadCooldownActive,
  __test: { lastByCompany, compositeLatency, cidKey, triadCooldownUntil }
};
