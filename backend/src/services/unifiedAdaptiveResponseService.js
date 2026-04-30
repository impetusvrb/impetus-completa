'use strict';

/**
 * Resposta adaptativa ao estado de métricas + aprendizado — apenas sinalização.
 * Ativo só com UNIFIED_ADAPTIVE_RESPONSE=true (o motor aplica influência suave).
 */

function compositeAvgLatency(metrics) {
  const m = metrics && typeof metrics === 'object' ? metrics : {};
  const g = Number(m.avg_latency?.gpt) || 0;
  const c = Number(m.avg_latency?.cognitive) || 0;
  if (g > 0 && c > 0) return (g + c) / 2;
  return Math.max(g, c);
}

/**
 * @param {object|null} metrics
 * @param {object|null} learningStats
 * @returns {{
 *   reduce_complexity: boolean,
 *   avoid_cognitive_pipeline: boolean,
 *   increase_conservatism: boolean
 * }}
 */
function applyAdaptiveSystemResponse(metrics, learningStats) {
  const out = {
    reduce_complexity: false,
    avoid_cognitive_pipeline: false,
    increase_conservatism: false
  };
  if (process.env.UNIFIED_ADAPTIVE_RESPONSE !== 'true') {
    return out;
  }

  const m = metrics && typeof metrics === 'object' ? metrics : {};
  const ls = learningStats && typeof learningStats === 'object' ? learningStats : {};

  if (Number(m.fallback_rate) > 0.25) {
    out.reduce_complexity = true;
    out.increase_conservatism = true;
  }

  if (compositeAvgLatency(m) > 2000) {
    out.avoid_cognitive_pipeline = true;
    out.increase_conservatism = true;
  }

  if (Number(ls.bad_rate) > 0.4 && (ls.n || 0) >= 5) {
    out.increase_conservatism = true;
    out.reduce_complexity = true;
  }

  return out;
}

module.exports = {
  applyAdaptiveSystemResponse,
  compositeAvgLatency
};
