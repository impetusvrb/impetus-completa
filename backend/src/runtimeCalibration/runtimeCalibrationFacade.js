'use strict';

const phaseY = require('./config/phaseYFeatureFlags');
const { calibrateTenantRuntime } = require('./tenantRuntimeCalibrationEngine');
const { advisePipelineConsolidation } = require('./pipelineConsolidationAdvisor');
const { getCalibrationTelemetry } = require('./runtimeCalibrationTelemetry');

function isRuntimeCalibrationLayerActive() {
  return (
    phaseY.isRuntimeCalibrationObservabilityEnabled() ||
    phaseY.isRuntimeCalibrationEnabled() ||
    phaseY.isTenantStabilizationEnabled()
  );
}

function getRuntimeCalibrationStatus(ctx = {}) {
  return {
    phase: 'Y',
    observability: phaseY.isRuntimeCalibrationObservabilityEnabled(),
    runtime_calibration: phaseY.isRuntimeCalibrationEnabled(),
    tenant_stabilization: phaseY.isTenantStabilizationEnabled(),
    tuning_advisor: phaseY.isRuntimeTuningAdvisorEnabled(),
    pipeline_consolidation: phaseY.isPipelineConsolidationAnalysisEnabled(),
    global_auto_apply: false,
    human_supervised: true,
    telemetry: getCalibrationTelemetry(),
    tenant_id: ctx.tenant_id
  };
}

function enrichWithRuntimeCalibration(user, payload, ctx = {}) {
  if (!isRuntimeCalibrationLayerActive() && !ctx.force) {
    return {
      payload,
      runtime_calibration: null,
      tenant_stabilization: null,
      operational_maturity: null,
      runtime_tuning: null,
      rollout_stability: null
    };
  }

  const mergedCtx = {
    ...ctx,
    functional_axis: ctx.functional_axis || user?.functional_axis || user?.functional_area,
    tenant_id: user?.company_id,
    controlled_activation: ctx.controlled_activation || ctx._controlledActivationBlock,
    runtime_enrichment: ctx.runtime_enrichment || ctx._runtimeEnrichmentBlock,
    runtime_stabilization: ctx.runtime_stabilization || ctx._runtimeStabilizationBlock,
    precision_delivery: ctx.precision_delivery || ctx._precisionDeliveryBlock,
    contextual_delivery: ctx.contextual_delivery || ctx._contextualDeliveryBlock,
    runtime_consistency: ctx.runtime_consistency || ctx._runtimeConsistencyBlock,
    decision_reliability: ctx.decision_reliability || ctx._decisionReliabilityBlock,
    operational_density: ctx.operational_density || ctx._operationalDensityBlock,
    enrichment_integrity: ctx.enrichment_integrity || ctx._enrichmentIntegrityBlock,
    telemetry_integrity: ctx.telemetry_integrity || ctx._telemetryIntegrityBlock,
    semantic_enrichment: ctx.semantic_enrichment || ctx._semanticEnrichmentBlock,
    operational_signal_quality: ctx.operational_signal_quality || ctx._operationalSignalQualityBlock,
    kpi_governance: ctx.kpi_governance,
    kpi_runtime_stabilization: ctx.kpi_runtime_stabilization,
    summary_governance: ctx.summary_governance,
    chat_alignment: ctx.chat_alignment,
    chat_operational_guidance: ctx.chat_operational_guidance,
    chat_reasoning_quality: ctx.chat_reasoning_quality,
    summary_relevance: ctx.summary_relevance
  };

  const tenantId = user?.company_id;
  const calibration = calibrateTenantRuntime(tenantId, user, mergedCtx);
  const pipelines = advisePipelineConsolidation(mergedCtx);

  const runtime_calibration = {
    phase: 'Y',
    shadow_only: !phaseY.isRuntimeCalibrationEnabled(),
    observability: phaseY.isRuntimeCalibrationObservabilityEnabled(),
    status: getRuntimeCalibrationStatus(mergedCtx),
    calibration_score: calibration.calibration_score,
    critical_tenant: calibration.critical_tenant,
    gap_total: calibration.gaps.gap_total,
    pipelines,
    auto_apply: false
  };

  const tenant_stabilization = {
    stable: calibration.stabilization.stable,
    instability_score: calibration.stabilization.instability_score,
    operational_pressure: calibration.stabilization.operational_pressure,
    runtime_degradation: calibration.stabilization.runtime_degradation,
    tenant_id: tenantId
  };

  const operational_maturity = calibration.maturity;

  const runtime_tuning = calibration.tuning;

  const rollout_stability = {
    rollout_stability: calibration.maturity.rollout_maturity,
    rollout_maturity: calibration.maturity.rollout_maturity,
    stabilization_maturity: calibration.maturity.stabilization_maturity,
    recommendations: calibration.tuning.rollout_recommendations
  };

  return {
    payload,
    runtime_calibration,
    tenant_stabilization,
    operational_maturity,
    runtime_tuning,
    rollout_stability,
    calibration
  };
}

module.exports = {
  isRuntimeCalibrationLayerActive,
  getRuntimeCalibrationStatus,
  enrichWithRuntimeCalibration,
  calibrateTenantRuntime,
  advisePipelineConsolidation
};
