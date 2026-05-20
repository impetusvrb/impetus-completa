'use strict';

const phaseQ = require('./config/phaseQFeatureFlags');
const { assessCognitiveConsistency } = require('./cognitiveConsistencyEngine');
const { validateDashboardConsistency } = require('./dashboardConsistencyValidator');
const { validateChatConsistency } = require('./chatConsistencyValidator');
const { validateKpiConsistency } = require('./kpiConsistencyValidator');
const { validateSummaryConsistency } = require('./summaryConsistencyValidator');
const { evaluateRuntimeTemporalConsistency } = require('./runtimeTemporalConsistency');
const { recordConsistencySample, getConsistencyTelemetry } = require('./consistencyTelemetry');
const { synchronizeRuntimeTruth } = require('./runtimeTruthSynchronizer');

function isConsistencyLayerActive() {
  return (
    phaseQ.isRuntimeConsistencyObservabilityEnabled() ||
    phaseQ.isRuntimeConsistencyEnabled() ||
    phaseQ.isInterchannelConsistencyEnabled() ||
    phaseQ.isTemporalContextStabilizationEnabled()
  );
}

function buildChannelContexts(ctx = {}) {
  const axis =
    ctx.cognitive_convergence?.runtime_truth_state?.authority?.contextual_truth?.functional_axis ||
    ctx.contextual_delivery?.targeting?.domain?.domain ||
    ctx.functional_axis;

  return {
    dashboard: { functional_axis: axis, axis, severity: ctx.dashboard_severity },
    kpi: {
      functional_axis: axis,
      domain: axis,
      runtime_truth_reference: ctx.kpi_truth?.runtime_truth_reference || axis
    },
    summary: {
      runtime_truth_reference: ctx.summary_truth?.runtime_truth_reference || axis,
      functional_axis: axis
    },
    chat: { functional_axis: axis, context_axis: axis, dashboard_severity: ctx.dashboard_severity },
    insight: { axis }
  };
}

function enrichWithRuntimeConsistency(user, legacyResponse, ctx = {}) {
  if (!isConsistencyLayerActive() && !ctx.force) {
    return { response: legacyResponse, runtime_consistency: null };
  }

  const channels = buildChannelContexts({
    ...ctx,
    functional_axis: legacyResponse.functional_axis || legacyResponse.functional_area || user?.functional_axis
  });

  const assessment = assessCognitiveConsistency(user, {
    runtime_truth_state: legacyResponse.runtime_truth_state || ctx.cognitive_convergence?.runtime_truth_state,
    cognitive_convergence: ctx.cognitive_convergence,
    contextual_delivery: ctx.contextual_delivery,
    ...channels
  }, { functional_axis: channels.dashboard.functional_axis });

  const sync = assessment.coordination.sync;
  const validators = {
    dashboard: validateDashboardConsistency(channels.dashboard, sync),
    chat: validateChatConsistency(channels.chat, sync),
    kpi: validateKpiConsistency(channels.kpi, sync),
    summary: validateSummaryConsistency(channels.summary, sync, channels.kpi)
  };

  const temporal = evaluateRuntimeTemporalConsistency(user, sync, {
    functional_axis: sync.canonical_axis
  });

  const allIssues = Object.values(validators).flatMap((v) => v.issues || []);
  const interchannel_divergence = allIssues.length > 0 || assessment.coordination.divergent;

  recordConsistencySample({
    cognitive_consistency_score: assessment.cognitive_consistency_score,
    interchannel_alignment: assessment.coordination.interchannel_alignment,
    runtime_truth_integrity: sync.runtime_truth_integrity,
    contextual_synchronization: assessment.coordination.resolved.contextual_synchronization,
    temporal_consistency: temporal.temporal_consistency,
    pipeline_agreement_score: assessment.coordination.pipeline_agreement_score
  });

  const runtime_consistency_block = {
    phase: 'Q',
    shadow_only: assessment.shadow_only,
    observability: phaseQ.isRuntimeConsistencyObservabilityEnabled(),
    flags: {
      runtime_consistency: phaseQ.isRuntimeConsistencyEnabled(),
      interchannel: phaseQ.isInterchannelConsistencyEnabled(),
      temporal: phaseQ.isTemporalContextStabilizationEnabled()
    },
    cognitive_consistency_score: assessment.cognitive_consistency_score,
    synchronization: sync,
    interchannel: {
      alignment: assessment.coordination.interchannel_alignment,
      validators,
      divergence_detected: interchannel_divergence
    },
    temporal,
    telemetry_snapshot: getConsistencyTelemetry(),
    auto_enforce: false
  };

  return { response: legacyResponse, runtime_consistency: runtime_consistency_block };
}

function enrichKpiConsistency(user, kpis, ctx = {}) {
  if (!isConsistencyLayerActive() && !ctx.force) return { kpis, runtime_consistency: null };
  const sync = synchronizeRuntimeTruth(user, ctx, ctx);
  const v = validateKpiConsistency({ functional_axis: ctx.functional_axis, domain: ctx.domain }, sync);
  return { kpis, runtime_consistency: { kpi: v, shadow_only: !phaseQ.isRuntimeConsistencyEnabled() } };
}

function enrichSummaryConsistency(user, summary, ctx = {}) {
  if (!isConsistencyLayerActive() && !ctx.force) return { summary, runtime_consistency: null };
  const sync = synchronizeRuntimeTruth(user, ctx, ctx);
  const v = validateSummaryConsistency(
    { runtime_truth_reference: ctx.functional_axis },
    sync,
    { functional_axis: ctx.functional_axis }
  );
  return { summary, runtime_consistency: { summary: v, shadow_only: !phaseQ.isRuntimeConsistencyEnabled() } };
}

function getConsistencyReport() {
  return {
    telemetry: getConsistencyTelemetry(),
    flags: {
      IMPETUS_RUNTIME_CONSISTENCY: phaseQ.isRuntimeConsistencyEnabled(),
      IMPETUS_INTERCHANNEL_CONSISTENCY: phaseQ.isInterchannelConsistencyEnabled(),
      IMPETUS_TEMPORAL_CONTEXT_STABILIZATION: phaseQ.isTemporalContextStabilizationEnabled(),
      IMPETUS_RUNTIME_CONSISTENCY_OBSERVABILITY: phaseQ.isRuntimeConsistencyObservabilityEnabled()
    },
    shadow_first: true
  };
}

module.exports = {
  isConsistencyLayerActive,
  enrichWithRuntimeConsistency,
  enrichKpiConsistency,
  enrichSummaryConsistency,
  getConsistencyReport,
  assessCognitiveConsistency,
  synchronizeRuntimeTruth
};
