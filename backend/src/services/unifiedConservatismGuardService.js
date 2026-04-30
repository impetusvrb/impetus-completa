'use strict';

/**
 * Deteção de conservadorismo excessivo (pipeline / fallback) — só observabilidade + meta.
 * Sem alterar executionLayer.
 */

/**
 * @param {object} params
 * @param {object|null} [params.metricsSnapshot]
 * @param {{ gpt?: number, cognitive?: number, cognitive_usage?: number, total_routed?: number }|null} [params.pipelineStats]
 * @param {number} [params.currentScore] — score da decisão actual (tríade vs GPT)
 */
function evaluateConservatism({ metricsSnapshot, pipelineStats, currentScore }) {
  const off = { over_conservative: false, severity: 'low', skipped: true };
  if (process.env.UNIFIED_CONSERVATISM_GUARD !== 'true') {
    return off;
  }

  const m = metricsSnapshot && typeof metricsSnapshot === 'object' ? metricsSnapshot : {};
  const fr = Number(m.fallback_rate) || 0;
  const avgScore = Number(m.avg_score) || 0;
  const g = Number(m.avg_latency?.gpt) || 0;
  const c = Number(m.avg_latency?.cognitive) || 0;
  const lat = Math.max(g, c);

  const ps = pipelineStats && typeof pipelineStats === 'object' ? pipelineStats : {};
  const gptN = Number(ps.gpt) || Number(m.pipeline_usage?.gpt) || 0;
  const cogN = Number(ps.cognitive) || Number(m.pipeline_usage?.cognitive) || 0;
  const total = Number(ps.total_routed) || gptN + cogN;
  const cognitiveShare =
    total > 0 ? cogN / total : Number(ps.cognitive_usage) > 0 ? Number(ps.cognitive_usage) / 100 : 0;

  const cs = Number(currentScore);
  const scoreHigh = Number.isFinite(cs) && cs > 0.58;

  let hits = 0;
  let severity = 'low';

  if (fr > 0.33 && total >= 8) {
    hits += 2;
    severity = 'high';
  } else if (fr > 0.22 && total >= 6) {
    hits += 1;
    severity = 'medium';
  }

  const gptHeavyThr =
    parseFloat(process.env.UNIFIED_CONSERVATISM_GPT_SHARE || '0.88') || 0.88;
  if (total >= 10 && cognitiveShare < 0.12 && (avgScore > 0.58 || scoreHigh)) {
    hits += 1;
    if (severity === 'low') severity = 'medium';
  }

  if (total >= 10 && gptN / total > gptHeavyThr && avgScore > 0.6) {
    hits += 1;
    if (severity !== 'high') severity = 'medium';
  }

  if (avgScore < 0.44 && fr > 0.18 && total >= 8) {
    hits += 1;
    severity = severity === 'high' ? 'high' : 'medium';
  }

  if (lat > 9000 && fr < 0.15 && cognitiveShare < 0.12 && total >= 10) {
    hits += 1;
    if (severity === 'low') severity = 'medium';
  }

  const over_conservative = hits >= 2 || severity === 'high';
  const out = {
    over_conservative,
    severity: over_conservative ? (severity === 'low' ? 'medium' : severity) : 'low',
    signals: {
      fallback_rate: fr,
      cognitive_share: Math.round(cognitiveShare * 1000) / 1000,
      total_routed: total,
      avg_score: avgScore
    }
  };

  try {
    if (out.over_conservative || out.severity !== 'low') {
      console.warn('[UNIFIED_CONSERVATISM_ALERT]', JSON.stringify(out));
    }
  } catch (_e) {}
  return out;
}

module.exports = {
  evaluateConservatism
};
