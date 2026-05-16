'use strict';

const { buildRolloutExplainability } = require('../explainability/qualityRolloutExplainability');

/**
 * Protecção de saturação — supressão/digest assistivo (sem apagar eventos industriais).
 */
function protectUserSaturation(signals = {}, opts = {}) {
  const insightRate = Math.max(0, Number(signals.insights_per_hour) || 0);
  const alertRate = Math.max(0, Number(signals.alerts_per_hour) || 0);
  const cognitiveRate = Math.max(0, Math.min(1, Number(signals.cognitive_interaction_rate) || 0));

  const thresholdInsight = opts.insights_per_hour_max ?? 25;
  const thresholdAlert = opts.alerts_per_hour_max ?? 40;

  const saturated =
    insightRate > thresholdInsight || alertRate > thresholdAlert || cognitiveRate > (opts.cognitive_rate_max ?? 0.9);

  const suppression = saturated
    ? {
        suppress_recommendation_stream: insightRate > thresholdInsight,
        batch_insights: true,
        executive_digest_only: alertRate > thresholdAlert,
        cognitive_cooldown_minutes: Math.min(120, 15 + Math.floor(insightRate)),
        priority_filter: 'high_only'
      }
    : {
        suppress_recommendation_stream: false,
        batch_insights: false,
        executive_digest_only: false,
        cognitive_cooldown_minutes: 0,
        priority_filter: 'all'
      };

  return {
    ok: true,
    saturated,
    suppression,
    saturation_score: Math.min(1, insightRate / (thresholdInsight * 2) + alertRate / (thresholdAlert * 2) + cognitiveRate * 0.2),
    emit_event: saturated,
    explainability: buildRolloutExplainability({
      rationale: saturated
        ? 'Limites de cadência declarados excedidos — aplicar batching/digest assistivo.'
        : 'Cadência dentro dos limiares configurados.',
      saturation_indicators: [`insights/h=${insightRate}`, `alerts/h=${alertRate}`, `cognitive=${cognitiveRate.toFixed(2)}`]
    })
  };
}

module.exports = { protectUserSaturation };
