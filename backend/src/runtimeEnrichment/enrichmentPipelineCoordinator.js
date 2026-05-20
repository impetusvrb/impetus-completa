'use strict';

const { measureContextualDataDensity } = require('./contextualDataDensityEngine');
const { analyzeOperationalSignalIntegrity } = require('./operationalSignalIntegrityAnalyzer');
const { detectTelemetryGaps } = require('./runtimeTelemetryGapDetector');
const { validateInsightGenerationIntegrity } = require('./insightGenerationIntegrityEngine');
const { enrichDashboardSemantics } = require('./dashboardSemanticEnrichmentEngine');
const { enrichOperationalNarrative } = require('./operationalNarrativeEnrichmentEngine');

function coordinateEnrichment(channel, payload, ctx = {}) {
  const channelCtx = { ...ctx, channel };
  const density = measureContextualDataDensity(payload, channelCtx);
  const signals = analyzeOperationalSignalIntegrity(payload, channelCtx);
  const telemetry = detectTelemetryGaps(payload, channelCtx);
  const insights = validateInsightGenerationIntegrity(payload, channelCtx);

  let dashboard = null;
  if (channel === 'dashboard' || channel === 'me') {
    dashboard = enrichDashboardSemantics(payload, channelCtx);
  }

  let narrative = null;
  if (channel === 'summary' || channel === 'chat') {
    narrative = enrichOperationalNarrative(payload, channelCtx);
  }

  return {
    channel,
    density,
    signals,
    telemetry,
    insights,
    dashboard,
    narrative,
    pipeline_legacy_preserved: true,
    auto_substitute: false
  };
}

module.exports = { coordinateEnrichment };
