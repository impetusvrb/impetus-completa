'use strict';

const phaseU = require('./config/phaseUFeatureFlags');
const { computeKpiPrecisionRuntime } = require('../kpiRollout/kpiPrecisionRuntime');
const { analyzeContextualPrecision } = require('./contextualPrecisionAnalyzer');

function superviseRuntimePrecision(user, kpiPayload, ctx = {}) {
  const precision = computeKpiPrecisionRuntime(user, kpiPayload, ctx);
  const contextual = analyzeContextualPrecision(user, kpiPayload, ctx);

  return {
    delivery_precision_score: precision.KPI_delivery_confidence,
    operational_delivery_accuracy: precision.KPI_delivery_accuracy,
    contextual_alignment_score: contextual.contextual_alignment_score,
    enforcement_active: phaseU.isKpiDeliveryPrecisionSupervisionEnabled(),
    shadow_only: !phaseU.isKpiDeliveryPrecisionSupervisionEnabled(),
    precision,
    contextual
  };
}

module.exports = { superviseRuntimePrecision };
