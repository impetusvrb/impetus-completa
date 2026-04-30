'use strict';

/**
 * Gera sinais de influência recomendada para o ecossistema — sem execução automática.
 * Controlado por UNIFIED_SYSTEM_INFLUENCE=true; com flag OFF devolve objeto neutro.
 */

/**
 * @param {object} params
 * @param {object|null} [params.decision]
 * @param {number} [params.score]
 * @param {object|null} [params.context]
 */
function generateSystemInfluenceSignals(params) {
  const neutro = {
    recommended_system_behavior: {
      prioritize_monitoring: false,
      reduce_risk_tolerance: false,
      increase_alert_sensitivity: false
    }
  };
  if (process.env.UNIFIED_SYSTEM_INFLUENCE !== 'true') {
    return neutro;
  }

  const p = params && typeof params === 'object' ? params : {};
  const score = Number(p.score);
  const decision = p.decision && typeof p.decision === 'object' ? p.decision : {};
  const hr = decision.humanRisk != null ? String(decision.humanRisk).toLowerCase() : '';

  const prioritize_monitoring =
    (Number.isFinite(score) && score > 0.55) || /high|crit/.test(hr);
  const reduce_risk_tolerance =
    (Number.isFinite(score) && score > 0.68) || /crit/.test(hr);
  const increase_alert_sensitivity =
    (Number.isFinite(score) && score > 0.72) || /high|crit/.test(hr);

  const out = {
    recommended_system_behavior: {
      prioritize_monitoring,
      reduce_risk_tolerance,
      increase_alert_sensitivity
    }
  };

  try {
    console.info('[UNIFIED_SYSTEM_INFLUENCE]', JSON.stringify(out));
  } catch (_e) {}

  return out;
}

module.exports = {
  generateSystemInfluenceSignals
};
