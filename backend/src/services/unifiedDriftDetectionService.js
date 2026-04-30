'use strict';

/**
 * Deteta degradação comportamental do motor (métricas agregadas) entre janelas.
 * Flag: UNIFIED_DRIFT_DETECTION
 */

/** @type {Map<string, { avg_score: number, fallback_rate: number, cognitive_share: number, ts: number }>} */
const previousByCompany = new Map();

function cidKey(companyId) {
  if (companyId == null || companyId === '') return '_global';
  return String(companyId).trim();
}

function cognitiveShareFromMetrics(m) {
  const pu = m && m.pipeline_usage && typeof m.pipeline_usage === 'object' ? m.pipeline_usage : {};
  const g = Number(pu.gpt) || 0;
  const c = Number(pu.cognitive) || 0;
  const t = g + c;
  if (!t) return 0;
  return Math.round((c / t) * 1000) / 10;
}

/**
 * @param {object|null} currentMetrics
 * @param {string|null|undefined} companyId
 * @returns {{ drift_detected: boolean, severity: 'low'|'medium'|'high', reasons: string[] }}
 */
function detectBehaviorDrift(currentMetrics, companyId) {
  const noop = { drift_detected: false, severity: 'low', reasons: [] };
  const m = currentMetrics && typeof currentMetrics === 'object' ? currentMetrics : {};
  const k = cidKey(companyId);

  const snapshot = {
    avg_score: Number.isFinite(Number(m.avg_score)) ? Number(m.avg_score) : 0,
    fallback_rate: Number.isFinite(Number(m.fallback_rate)) ? Number(m.fallback_rate) : 0,
    cognitive_share: cognitiveShareFromMetrics(m),
    ts: Date.now()
  };

  if (process.env.UNIFIED_DRIFT_DETECTION !== 'true') {
    previousByCompany.set(k, snapshot);
    return noop;
  }

  const prev = previousByCompany.get(k);
  previousByCompany.set(k, snapshot);

  if (!prev || !Number.isFinite(prev.avg_score)) {
    return noop;
  }

  const reasons = [];
  let drift_detected = false;
  let severity = 'low';

  const ca = Number(m.avg_score);
  const pa = prev.avg_score;
  if (pa >= 0.15 && ca < pa * 0.8) {
    drift_detected = true;
    reasons.push('score_drop_20pct');
    severity = ca < pa * 0.65 ? 'high' : 'medium';
  }

  const pfb = prev.fallback_rate;
  const cfb = snapshot.fallback_rate;
  if (pfb >= 0.08 && cfb > pfb * 1.3 && cfb - pfb >= 0.12) {
    drift_detected = true;
    reasons.push('fallback_surge');
    if (severity !== 'high') severity = 'medium';
  }

  const pcs = prev.cognitive_share;
  const ccs = snapshot.cognitive_share;
  if ((pcs >= 12 || ccs >= 12) && Math.abs(ccs - pcs) >= 35) {
    drift_detected = true;
    reasons.push('pipeline_shift');
    if (severity === 'low') severity = 'medium';
  }

  const out = {
    drift_detected,
    severity: drift_detected ? severity : 'low',
    reasons
  };

  if (drift_detected) {
    try {
      console.warn('[UNIFIED_DRIFT_DETECTED]', JSON.stringify(out));
    } catch (_e) {}
  }

  return out;
}

module.exports = {
  detectBehaviorDrift,
  __test: { previousByCompany, cognitiveShareFromMetrics }
};
