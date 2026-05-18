'use strict';

const cognitive = require('../../../runtime-validation/enterpriseCognitiveMaturityEngine');
const operational = require('./environmentOperationalCorrelationEngine');

/**
 * Camada cognitiva: tendências ambientais + pressão UX + correlação operacional.
 */
function environmentalCognitiveCorrelationEngine(ctx = {}) {
  const maturity = cognitive.analyzeCognitiveMaturity(ctx.cognitive_input || {});
  const op = operational.environmentalOperationalCorrelationEngine(ctx.operational_input || {});

  const narrative_hints = [];
  if (ctx.ph_trend === 'falling' && ctx.historical_recurrence) {
    narrative_hints.push('ph_decline_supplier_production_pattern');
  }
  if (ctx.emission_forecast_exceeds_limit) {
    narrative_hints.push('emission_limit_risk_2h_window');
  }

  return {
    ok: true,
    domain: 'environment',
    framework: 'environmental_cognitive_correlation',
    cognitive_maturity: maturity,
    operational_correlation: op,
    narrative_hints,
    explainability_ready: true,
    ai_operational_hook: true,
    assistive_only: true
  };
}

module.exports = { environmentalCognitiveCorrelationEngine };
