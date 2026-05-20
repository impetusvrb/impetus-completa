'use strict';

const phaseX = require('./config/phaseXFeatureFlags');
const { enrichRuntimeOperational } = require('./runtimeOperationalEnrichmentEngine');
const { getEnrichmentTelemetry } = require('./runtimeEnrichmentTelemetry');

function isRuntimeEnrichmentLayerActive() {
  return (
    phaseX.isRuntimeEnrichmentObservabilityEnabled() ||
    phaseX.isRuntimeEnrichmentEnabled() ||
    phaseX.isContextualDensityEngineEnabled()
  );
}

function getRuntimeEnrichmentStatus(ctx = {}) {
  return {
    phase: 'X',
    observability: phaseX.isRuntimeEnrichmentObservabilityEnabled(),
    runtime_enrichment: phaseX.isRuntimeEnrichmentEnabled(),
    operational_signal_analysis: phaseX.isOperationalSignalAnalysisEnabled(),
    contextual_density_engine: phaseX.isContextualDensityEngineEnabled(),
    dashboard_enrichment: phaseX.isDashboardEnrichmentEnabled(),
    telemetry_gap_detection: phaseX.isTelemetryGapDetectionEnabled(),
    global_auto_remediation: false,
    invented_data_policy: 'forbidden',
    telemetry: getEnrichmentTelemetry(),
    tenant_id: ctx.tenant_id
  };
}

function enrichWithRuntimeDataIntegrity(user, payload, ctx = {}) {
  if (!isRuntimeEnrichmentLayerActive() && !ctx.force) {
    return {
      payload,
      runtime_enrichment: null,
      operational_density: null,
      enrichment_integrity: null,
      telemetry_integrity: null,
      semantic_enrichment: null,
      operational_signal_quality: null
    };
  }

  const mergedCtx = {
    ...ctx,
    functional_axis: ctx.functional_axis || user?.functional_axis || user?.functional_area,
    tenant_id: user?.company_id
  };

  const enriched = enrichRuntimeOperational(user, payload, mergedCtx);
  const c = enriched.coordinated;

  const runtime_enrichment = {
    phase: 'X',
    shadow_only: !phaseX.isRuntimeEnrichmentEnabled(),
    observability: phaseX.isRuntimeEnrichmentObservabilityEnabled(),
    status: getRuntimeEnrichmentStatus(mergedCtx),
    consolidated_signals: enriched.consolidated_signals,
    low_density: enriched.low_density,
    channel: mergedCtx.channel || 'dashboard',
    invented_data: false,
    auto_remediate: false
  };

  const operational_density = {
    runtime_density_score: c.density.runtime_density_score,
    operational_density: c.density.operational_density,
    contextual_richness: c.density.contextual_richness,
    entity_count: c.density.entity_count
  };

  const enrichment_integrity = {
    enrichment_integrity_score: enriched.integrity.enrichment_integrity_score,
    valid: enriched.integrity.valid,
    issues: enriched.integrity.issues,
    leakage_free: enriched.integrity.leakage_free
  };

  const telemetry_integrity = {
    gaps_detected: c.telemetry.gaps_detected,
    gap_count: c.telemetry.gap_count,
    telemetry_integrity: c.telemetry.telemetry_integrity,
    gaps: c.telemetry.gaps
  };

  const semantic_enrichment = {
    semantic_usefulness: c.density.semantic_usefulness,
    insight_feeding_quality: c.density.insight_feeding_quality,
    dashboard: c.dashboard,
    narrative: c.narrative,
    invented_metrics: false
  };

  const operational_signal_quality = {
    signal_integrity_score: c.signals.signal_integrity_score,
    insight_utility_score: c.insights.insight_utility_score,
    issues: [...(c.signals.issues || []), ...(c.insights.issues || [])],
    recommendations: c.dashboard?.recommendations || []
  };

  return {
    payload,
    runtime_enrichment,
    operational_density,
    enrichment_integrity,
    telemetry_integrity,
    semantic_enrichment,
    operational_signal_quality,
    enriched
  };
}

module.exports = {
  isRuntimeEnrichmentLayerActive,
  getRuntimeEnrichmentStatus,
  enrichWithRuntimeDataIntegrity,
  enrichRuntimeOperational
};
