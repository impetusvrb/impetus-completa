'use strict';

const { coordinateEnrichment } = require('./enrichmentPipelineCoordinator');
const { validateContextualEnrichment } = require('./contextualEnrichmentValidator');
const { recordEnrichmentSample } = require('./runtimeEnrichmentTelemetry');

function enrichRuntimeOperational(user, payload, ctx = {}) {
  const channel = ctx.channel || 'dashboard';
  const coordinated = coordinateEnrichment(channel, payload, ctx);
  const integrity = validateContextualEnrichment(payload, ctx);

  const consolidated_signals = {
    density: coordinated.density,
    signal_integrity: coordinated.signals.signal_integrity_score,
    telemetry_integrity: coordinated.telemetry.telemetry_integrity,
    insight_utility: coordinated.insights.insight_utility_score,
    enrichment_integrity: integrity.enrichment_integrity_score
  };

  recordEnrichmentSample({
    runtime_density_score: coordinated.density.runtime_density_score,
    operational_density: coordinated.density.operational_density,
    contextual_richness: coordinated.density.contextual_richness,
    semantic_usefulness: coordinated.density.semantic_usefulness,
    insight_feeding_quality: coordinated.density.insight_feeding_quality
  });

  return {
    consolidated_signals,
    coordinated,
    integrity,
    low_density: coordinated.density.runtime_density_score < 0.55,
    invented_data: false,
    auto_remediate: false
  };
}

module.exports = { enrichRuntimeOperational };
