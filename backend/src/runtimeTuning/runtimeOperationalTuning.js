'use strict';

const flags = require('./config/runtimeTuningFeatureFlags');
const { analyzeRuntimePressure } = require('./runtimePressureAnalyzer');
const { adviseDeliveryOptimization } = require('./deliveryOptimizationAdvisor');
const { adviseEnrichmentOptimization } = require('./enrichmentOptimizationAdvisor');
const { superviseRuntimeEfficiency } = require('./runtimeEfficiencySupervisor');
const { recordTuningReport } = require('./runtimeTuningTelemetry');

function _safePhaseYTuning(ctx) {
  try {
    const y = require('../runtimeCalibration/controlledRuntimeTuningAdvisor');
    return y.adviseRuntimeTuning(
      ctx.tenant_id,
      ctx.tenant_stabilization || { stable: true },
      ctx.operational_maturity || { composite_maturity: 0.8 },
      ctx.gaps || ctx.runtime_calibration || {},
      ctx
    );
  } catch {
    return { tuning_recommendations: [], auto_apply: false };
  }
}

function generateOperationalTuning(ctx = {}) {
  const pressure = analyzeRuntimePressure(ctx);
  const delivery = adviseDeliveryOptimization(ctx);
  const enrichment = adviseEnrichmentOptimization(ctx);
  const efficiency = superviseRuntimeEfficiency(ctx);
  const calibrationTuning = _safePhaseYTuning(ctx);

  const reasoning = [];
  if (ctx.chat_reasoning_quality && !ctx.chat_reasoning_quality.stable) {
    reasoning.push('Estabilizar raciocínio chat antes de expandir rollout');
  }
  if (ctx.decision_reliability?.runtime_decision_confidence < 0.65) {
    reasoning.push('Reforçar decision_reliability com dados de telemetria validados');
  }

  const tuning_recommendations = [
    ...calibrationTuning.tuning_recommendations,
    ...delivery.delivery_recommendations.map((r) => (typeof r === 'string' ? r : r.action)),
    ...enrichment.enrichment_recommendations,
    ...reasoning
  ];

  const unique = [...new Set(tuning_recommendations)];

  recordTuningReport({
    efficiency: efficiency.efficiency_score,
    pressure: pressure.runtime_pressure,
    optimizations: unique.length
  });

  return {
    tuning_recommendations: unique,
    delivery_optimization: delivery,
    enrichment_optimization: enrichment,
    reasoning_optimization: { recommendations: reasoning, auto_apply: false },
    runtime_pressure: pressure,
    efficiency,
    calibration_tuning: calibrationTuning,
    recommendation_only: true,
    auto_apply: false,
    auto_remediate: false,
    enforcement_active: flags.isOperationalRuntimeTuningEnabled(),
    human_supervision_required: true
  };
}

module.exports = { generateOperationalTuning };
