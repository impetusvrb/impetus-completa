'use strict';

/**
 * Interpretação legível das métricas agregadas (sem decisões automáticas).
 * Flag: UNIFIED_METRICS_INTERPRETER (default OFF).
 */

/**
 * @param {object} params
 * @param {object|null} [params.metricsSnapshot]
 */
function interpretMetrics({ metricsSnapshot }) {
  const off = {
    system_health: 'good',
    dominant_issue: 'latency',
    recommendation: '',
    skipped: true
  };
  if (process.env.UNIFIED_METRICS_INTERPRETER !== 'true') {
    return off;
  }

  const m = metricsSnapshot && typeof metricsSnapshot === 'object' ? metricsSnapshot : {};
  const fr = Number(m.fallback_rate) || 0;
  const avgScore = Number(m.avg_score) || 0;
  const g = Number(m.avg_latency?.gpt) || 0;
  const c = Number(m.avg_latency?.cognitive) || 0;
  const lat = Math.max(g, c);

  const pu = m.pipeline_usage || {};
  const tot = (Number(pu.gpt) || 0) + (Number(pu.cognitive) || 0);
  const cogShare = tot > 0 ? (Number(pu.cognitive) || 0) / tot : 0;

  let system_health = 'good';
  if (fr > 0.38 || lat > 14500 || avgScore < 0.3) {
    system_health = 'critical';
  } else if (fr > 0.2 || lat > 7500 || avgScore < 0.45 || (cogShare < 0.08 && tot > 20 && avgScore > 0.62)) {
    system_health = 'warning';
  }

  const scores = {
    latency: Math.min(1, lat / 15000),
    fallback: Math.min(1, fr / 0.45),
    learning: Math.min(1, (0.55 - Math.min(0.55, avgScore)) / 0.55),
    cost: Math.min(1, tot > 0 ? (Number(pu.cognitive) || 0) / Math.max(30, tot) : 0)
  };

  let dominant_issue = 'latency';
  let maxS = scores.latency;
  if (scores.fallback >= maxS - 0.02 && scores.fallback >= 0.15) {
    dominant_issue = 'fallback';
    maxS = scores.fallback;
  }
  if (scores.learning > maxS) {
    dominant_issue = 'learning';
    maxS = scores.learning;
  }
  if (scores.cost > maxS + 0.15 && tot > 25) {
    dominant_issue = 'cost';
  }

  /** @type {Record<string, string>} */
  const rec = {
    latency:
      lat > 10000
        ? 'Latência cognitiva/GPT elevada na janela — rever carga, limites CPM ou escalonamento.'
        : 'Latência dentro do esperado para a janela actual.',
    fallback:
      fr > 0.25
        ? 'Taxa de fallback alta — validar prompts, disponibilidade dos modelos e limiares do motor unificado.'
        : 'Fallback sob controlo na janela actual.',
    learning:
      avgScore < 0.42
        ? 'Score médio baixo — possível ruído no aprendizado ou métricas; rever outcomes e estabilidade.'
        : 'Distribuição de score coerente com operação normal.',
    cost:
      'Cognitive share elevada com volume grande — monitorizar custo e caps da tríade.'
  };

  let recommendation = rec[dominant_issue] || rec.latency;
  if (system_health === 'critical') {
    recommendation = `[crítico] ${recommendation}`;
  } else if (system_health === 'warning') {
    recommendation = `[atenção] ${recommendation}`;
  }

  const out = {
    system_health,
    dominant_issue,
    recommendation,
    scores
  };
  try {
    console.info('[UNIFIED_SYSTEM_HEALTH]', JSON.stringify(out));
  } catch (_e) {}
  return out;
}

module.exports = {
  interpretMetrics
};
