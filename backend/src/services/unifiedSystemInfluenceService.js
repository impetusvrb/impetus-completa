'use strict';

/**
 * Influência recomendada (sem execução automática).
 * - recommended_system_behavior: legado (flag UNIFIED_SYSTEM_INFLUENCE)
 * - controlled_system_influence: vista operacional para consumo por meta / health
 */

/**
 * @param {object} args
 * @param {number} [args.score]
 * @param {number} [args.predicted_risk]
 * @param {number} [args.fallback_rate]
 * @param {boolean} [args.cognitive_pipeline]
 * @param {boolean} [args.cost_force_disable]
 * @param {object|null} [args.learning_stats] — { good_rate, n }
 * @param {number} [args.learning_confidence]
 * @param {string} [args.score_risk_level] — risk_level do motor de score
 */
function buildControlledSystemInfluence(args) {
  const a = args && typeof args === 'object' ? args : {};
  const score = Number(a.score);
  const pr = Number(a.predicted_risk);
  const fr = Number(a.fallback_rate);
  const cognitivePipeline = !!a.cognitive_pipeline;
  const costBlock = !!a.cost_force_disable;

  const scoreOk = Number.isFinite(score);
  const priority_override = scoreOk && score > 0.75;

  let risk_level = 'low';
  if (Number.isFinite(pr) && pr > 0.7) {
    risk_level = 'high';
  } else {
    const rl = String(a.score_risk_level || '').toLowerCase();
    if (rl === 'critical' || rl === 'high') risk_level = 'high';
    else if (rl === 'medium' || rl === 'moderate') risk_level = 'medium';
    else if (scoreOk && score > 0.82) risk_level = 'high';
    else if (scoreOk && score > 0.65) risk_level = 'medium';
  }

  const fallbackHigh = Number.isFinite(fr) && fr > 0.22;

  const ls = a.learning_stats && typeof a.learning_stats === 'object' ? a.learning_stats : {};
  const gr = Number(ls.good_rate);
  const lc = Number(a.learning_confidence);
  const cognitive_reliable =
    !costBlock &&
    Number.isFinite(fr) &&
    fr <= 0.15 &&
    ((Number.isFinite(gr) && gr > 0.55) || (Number.isFinite(lc) && lc > 0.45));

  const recommended_pipeline = fallbackHigh
    ? 'gpt'
    : cognitive_reliable
      ? 'cognitive'
      : cognitivePipeline
        ? 'cognitive'
        : 'gpt';

  const confidence_score = scoreOk ? Math.round(score * 1000) / 1000 : 0;
  const requires_attention = scoreOk ? score > 0.5 : false;

  return {
    priority_override,
    recommended_pipeline,
    risk_level,
    confidence_score,
    requires_attention
  };
}

/**
 * @param {object} params
 * @param {object|null} [params.decision]
 * @param {number} [params.score]
 * @param {object|null} [params.context]
 * @param {string|null} [params.companyId]
 * @param {number} [params.predicted_risk]
 * @param {number} [params.fallback_rate]
 * @param {boolean} [params.cognitive_pipeline]
 * @param {boolean} [params.cost_force_disable]
 * @param {object|null} [params.learning_stats]
 * @param {number} [params.learning_confidence]
 * @param {string} [params.score_risk_level]
 */
function generateSystemInfluenceSignals(params) {
  const neutroBeh = {
    prioritize_monitoring: false,
    reduce_risk_tolerance: false,
    increase_alert_sensitivity: false
  };

  const p = params && typeof params === 'object' ? params : {};
  const score = Number(p.score);
  const decision = p.decision && typeof p.decision === 'object' ? p.decision : {};
  const hr = decision.humanRisk != null ? String(decision.humanRisk).toLowerCase() : '';

  const controlled_system_influence = buildControlledSystemInfluence({
    score: p.score,
    predicted_risk: p.predicted_risk,
    fallback_rate: p.fallback_rate,
    cognitive_pipeline: p.cognitive_pipeline,
    cost_force_disable: p.cost_force_disable,
    learning_stats: p.learning_stats,
    learning_confidence: p.learning_confidence,
    score_risk_level: p.score_risk_level
  });

  let recommended_system_behavior = { ...neutroBeh };

  if (process.env.UNIFIED_SYSTEM_INFLUENCE === 'true') {
    const prioritize_monitoring =
      (Number.isFinite(score) && score > 0.55) || /high|crit/.test(hr);
    const reduce_risk_tolerance =
      (Number.isFinite(score) && score > 0.68) || /crit/.test(hr);
    const increase_alert_sensitivity =
      (Number.isFinite(score) && score > 0.72) || /high|crit/.test(hr);
    recommended_system_behavior = {
      prioritize_monitoring,
      reduce_risk_tolerance,
      increase_alert_sensitivity
    };
  }

  const out = {
    recommended_system_behavior,
    controlled_system_influence
  };

  try {
    console.info(
      '[UNIFIED_SYSTEM_INFLUENCE]',
      JSON.stringify({
        company_id: p.companyId != null ? p.companyId : null,
        system_influence: controlled_system_influence,
        legacy_behavior: recommended_system_behavior
      })
    );
  } catch (_e) {}

  return out;
}

module.exports = {
  generateSystemInfluenceSignals,
  buildControlledSystemInfluence
};
