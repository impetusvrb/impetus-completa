'use strict';

const flagsZP1 = require('../../../config/phaseZP1FeatureFlags');
const { validateTelemetryHealth } = require('./telemetry/telemetryHealthValidator');
const { validateOeeUsefulness } = require('./validation/oeeUsefulnessValidator');
const { validateContextualOeeIntegrity } = require('./validation/contextualOeeIntegrity');
const { validateThroughputConsistency } = require('./validation/throughputConsistencyValidator');
const { validateBottleneckPrecision } = require('./validation/bottleneckPrecisionValidator');
const { validateFlowIntegrity } = require('./validation/flowIntegrityRuntime');
const { validateCognitiveDensity } = require('./density/cognitiveDensityValidator');
const { validateProductionSummarySemantic } = require('./validation/productionSummarySemanticValidator');
const { validateContextualProductionAi } = require('./validation/contextualProductionAiValidator');
const { validateProductionSemanticIsolation } = require('./governance/productionSemanticIsolationValidator');
const { validateTelemetryBoundary } = require('./governance/telemetryBoundaryValidator');
const { validateProductionFallbackIntegrity } = require('./governance/productionFallbackIntegrity');
const { buildGracefulTelemetryFallback } = require('./governance/gracefulTelemetryFallback');
const { superviseDegradedRuntime } = require('./governance/degradedRuntimeSupervisor');
const { scoreOperationalUsefulness } = require('./validation/operationalUsefulnessScorer');
const { analyzeProductionPerformance } = require('./performance/productionPerformanceAnalyzer');
const { profileTelemetryLoad } = require('./performance/telemetryLoadProfiler');
const { analyzeCockpitRenderCost } = require('./performance/cockpitRenderCostAnalyzer');
const { measureIndustrialRuntimePressure } = require('./performance/industrialRuntimePressure');
const { buildTelemetryGovernanceObservability } = require('./observability/telemetryGovernanceObservability');
const { buildIndustrialCockpitHealth } = require('./observability/industrialCockpitHealth');
const { validateProductionRuntimeStability } = require('./runtime/productionRuntimeStabilityValidator');

async function runProductionLiveValidation(user = {}, payload = {}, ctx = {}, opts = {}) {
  if (!flagsZP1.isProductionLiveValidationEnabled() && !ctx.force_production_live_validation) {
    return { skipped: true, reason: 'zp1_live_validation_off' };
  }

  const t0 = Date.now();
  let signalBundle = opts.signal_bundle;
  if (!signalBundle) {
    const loader = require('../bridge/productionSignalLoader');
    signalBundle = await loader.loadProductionTenantSignals(user, { ...ctx, mock_signals: ctx.mock_signals });
  }

  const consolidated = opts.consolidated || {
    centers: payload.production_cognitive_centers || payload.production_cognitive_runtime?.centers,
    widgets: payload.widgets_promoted,
    consolidation_applied: payload.production_cognitive_runtime?.consolidation_applied,
    telemetry_readiness: signalBundle.telemetry_readiness,
    production_narrative: payload.production_cognitive_runtime?.production_narrative,
    production_contextual_ai: payload.production_contextual_ai
  };

  const telemetry = validateTelemetryHealth(signalBundle, signalBundle.telemetry || {});
  const oee = validateOeeUsefulness(signalBundle, consolidated);
  const oeeIntegrity = validateContextualOeeIntegrity(signalBundle);
  const throughput = validateThroughputConsistency(signalBundle);
  const bottleneck = validateBottleneckPrecision(signalBundle);
  const flow = validateFlowIntegrity(signalBundle);
  const density = validateCognitiveDensity(consolidated);
  const summary = validateProductionSummarySemantic(payload, consolidated);
  const ai = validateContextualProductionAi(consolidated, payload);
  const isolation = validateProductionSemanticIsolation(payload, consolidated);
  const boundary = validateTelemetryBoundary(signalBundle);
  const fallback = validateProductionFallbackIntegrity(payload, consolidated);
  const graceful = buildGracefulTelemetryFallback(signalBundle);
  const perf = analyzeProductionPerformance({ total_ms: Date.now() - t0, ...opts.timings });
  const telLoad = profileTelemetryLoad(signalBundle);
  const renderCost = analyzeCockpitRenderCost(consolidated);
  const pressure = measureIndustrialRuntimePressure(perf, telLoad);

  const usefulness = scoreOperationalUsefulness({
    oee,
    throughput,
    bottleneck,
    density,
    semantic: summary,
    ai
  });

  const stability = opts.stability_b
    ? validateProductionRuntimeStability(opts.stability_a, opts.stability_b)
    : { runtime_stable: true };

  const production_live_validation = {
    phase: 'Z.P1',
    mode: flagsZP1.productionLiveValidationMode(),
    telemetry_ready: telemetry.telemetry_health.ready,
    runtime_stable: stability.runtime_stable !== false,
    density_safe: density.density_safe,
    cross_domain_clean: isolation.cross_domain_clean,
    industrial_usefulness: usefulness,
    performance_safe: perf.performance_safe && !pressure.saturation,
    overload_detected: density.overload?.overload_detected === true,
    summary_semantic_valid: summary.summary_semantic_valid,
    delivery_mutation: false
  };

  const report = {
    production_live_validation,
    telemetry_health: telemetry.telemetry_health,
    telemetry_governance: buildTelemetryGovernanceObservability(
      telemetry.telemetry_health,
      telemetry.stale,
      telemetry.degraded
    ),
    oee_validation: { usefulness: oee, integrity: oeeIntegrity },
    throughput_validation: throughput,
    bottleneck_validation: { precision: bottleneck, flow },
    density_validation: density,
    summary_validation: summary,
    ai_validation: ai,
    isolation_validation: isolation,
    telemetry_boundary: boundary,
    fallback_validation: { ...fallback, graceful },
    degraded_supervisor: superviseDegradedRuntime(telemetry),
    performance: { ...perf, telemetry_load: telLoad, render_cost: renderCost, pressure },
    stability,
    ...buildIndustrialCockpitHealth({ production_live_validation })
  };

  return report;
}

function getProductionLiveValidationStatus() {
  return {
    phase: 'Z.P1',
    live_validation: flagsZP1.productionLiveValidationMode(),
    telemetry_governance: flagsZP1.isTelemetryGovernanceEnabled(),
    industrial_runtime_health: flagsZP1.isIndustrialRuntimeHealthEnabled(),
    overload_protection: flagsZP1.isProductionOverloadProtectionEnabled(),
    performance_observability: flagsZP1.isProductionPerformanceObservabilityEnabled()
  };
}

module.exports = {
  runProductionLiveValidation,
  getProductionLiveValidationStatus
};
