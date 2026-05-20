'use strict';

const flags = require('./config/runtimeTuningFeatureFlags');
const { generateOperationalTuning } = require('./runtimeOperationalTuning');
const { analyzeRuntimePressure } = require('./runtimePressureAnalyzer');
const { adviseDeliveryOptimization } = require('./deliveryOptimizationAdvisor');
const { adviseEnrichmentOptimization } = require('./enrichmentOptimizationAdvisor');
const { superviseRuntimeEfficiency } = require('./runtimeEfficiencySupervisor');
const { getRuntimeTuningTelemetry } = require('./runtimeTuningTelemetry');

function isRuntimeTuningLayerActive() {
  return (
    flags.isRuntimeTuningObservabilityEnabled() ||
    flags.isOperationalRuntimeTuningEnabled() ||
    flags.isRuntimeTuningAdvisorEnabled()
  );
}

function getRuntimeTuningStatus(ctx = {}) {
  return {
    layer: 'operational-runtime-tuning',
    observability: flags.isRuntimeTuningObservabilityEnabled(),
    operational_tuning: flags.isOperationalRuntimeTuningEnabled(),
    tuning_advisor: flags.isRuntimeTuningAdvisorEnabled(),
    recommendation_only: true,
    auto_apply: false,
    auto_remediate: false,
    tenant_id: ctx.tenant_id,
    telemetry: getRuntimeTuningTelemetry()
  };
}

function getRuntimeTuningReport(ctx = {}) {
  const tuning = generateOperationalTuning(ctx);
  return {
    ok: true,
    status: getRuntimeTuningStatus(ctx),
    tuning,
    pressure: tuning.runtime_pressure,
    efficiency: tuning.efficiency,
    delivery: tuning.delivery_optimization,
    enrichment: tuning.enrichment_optimization,
    telemetry: getRuntimeTuningTelemetry(),
    auto_apply: false
  };
}

module.exports = {
  isRuntimeTuningLayerActive,
  getRuntimeTuningStatus,
  getRuntimeTuningReport,
  generateOperationalTuning,
  analyzeRuntimePressure,
  adviseDeliveryOptimization,
  adviseEnrichmentOptimization,
  superviseRuntimeEfficiency
};
