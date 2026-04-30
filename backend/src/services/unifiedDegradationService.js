'use strict';

/**
 * Compara snapshot atual de métricas com último snapshot por empresa (memória de processo).
 * Deteta degradação de serviço sem side-effects externos.
 */

/** @type {Map<string, { composite_latency: number, avg_score: number, fallback_rate: number, ts: number }>} */
const lastByCompany = new Map();

/** @type {Map<string, { cognitive_share: number, gpt_share: number, ts: number }>} */
const lastPipelineMixByCompany = new Map();

/** @type {Map<string, { total_decisions: number, ts: number }>} */
const lastDecisionVolumeByCompany = new Map();

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
 * Deriva silenciosa da distribuição de decisões / score (complementa latência/fallback).
 * Log [UNIFIED_BEHAVIOR_DRIFT] quando UNIFIED_BEHAVIOR_DRIFT=true.
 *
 * @param {object|null} metrics — getMetricsSnapshot
 * @param {string|null|undefined} companyId
 * @returns {{ drift: boolean, severity: 'low'|'medium'|'high', reasons: string[], skipped?: boolean }}
 */
function detectSilentBehaviorDrift(metrics, companyId) {
  const empty = { drift: false, severity: 'low', reasons: [] };
  if (process.env.UNIFIED_BEHAVIOR_DRIFT !== 'true') {
    return { ...empty, skipped: true };
  }

  const m = metrics && typeof metrics === 'object' ? metrics : {};
  const samples = Number(m.total_decisions) || 0;
  const minN =
    parseInt(process.env.UNIFIED_BEHAVIOR_DRIFT_MIN_N || '14', 10) || 14;
  if (samples < minN) return empty;

  const pu = m.pipeline_usage && typeof m.pipeline_usage === 'object' ? m.pipeline_usage : {};
  const gpt = Number(pu.gpt) || 0;
  const cog = Number(pu.cognitive) || 0;
  const tot = gpt + cog;
  if (tot < 8) return empty;

  const cognitiveShare = cog / tot;
  const k = cidKey(companyId);
  const prev = lastPipelineMixByCompany.get(k);
  const avg = Number(m.avg_score);
  const fr = Number(m.fallback_rate);

  const reasons = [];
  let drift = false;
  let severity = 'low';

  if (prev && Number.isFinite(prev.cognitive_share)) {
    const mixDelta = Math.abs(cognitiveShare - prev.cognitive_share);
    const mixThr =
      parseFloat(process.env.UNIFIED_BEHAVIOR_MIX_DELTA || '0.26') || 0.26;
    if (mixDelta > mixThr) {
      drift = true;
      severity = mixDelta > 0.4 ? 'high' : 'medium';
      reasons.push('pipeline_mix_shift');
    }
  }

  const scoreDropThr =
    parseFloat(process.env.UNIFIED_BEHAVIOR_SCORE_SHIFT || '0.14') || 0.14;
  if (
    prev &&
    Number.isFinite(prev.avg_score) &&
    Number.isFinite(avg) &&
    prev.avg_score - avg > scoreDropThr &&
    Number.isFinite(fr) &&
    fr < 0.18
  ) {
    drift = true;
    severity = severity === 'high' ? 'high' : 'medium';
    reasons.push('score_drop_without_fallback_explanation');
  }

  const td = Number(m.total_decisions) || 0;
  const volPrev = lastDecisionVolumeByCompany.get(k);
  if (volPrev && td >= 8 && volPrev.total_decisions >= 8) {
    const ratio =
      volPrev.total_decisions > 0 ? td / volPrev.total_decisions : 1;
    const volThr =
      parseFloat(process.env.UNIFIED_BEHAVIOR_VOLUME_SHIFT_RATIO || '1.45') || 1.45;
    if (ratio >= volThr || ratio <= 1 / volThr) {
      drift = true;
      severity = severity === 'high' ? 'high' : 'medium';
      reasons.push('decision_throughput_shift');
    }
  }
  lastDecisionVolumeByCompany.set(k, { total_decisions: td, ts: Date.now() });

  lastPipelineMixByCompany.set(k, {
    cognitive_share: cognitiveShare,
    gpt_share: gpt / tot,
    avg_score: Number.isFinite(avg) ? avg : prev?.avg_score,
    ts: Date.now()
  });

  const out = { drift, severity, reasons };
  if (drift) {
    try {
      console.warn('[UNIFIED_BEHAVIOR_DRIFT]', JSON.stringify({ company_key: k, ...out }));
    } catch (_e) {}
  }
  return out;
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
  detectSilentBehaviorDrift,
  triggerDegradationResponse,
  isTriadCooldownActive,
  __test: {
    lastByCompany,
    lastPipelineMixByCompany,
    lastDecisionVolumeByCompany,
    compositeLatency,
    cidKey,
    triadCooldownUntil
  }
};
