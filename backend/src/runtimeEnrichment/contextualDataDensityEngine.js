'use strict';

const phaseX = require('./config/phaseXFeatureFlags');
const { logPhaseX } = require('./phaseXLogger');
const { extractKpiList, extractModules, extractWidgets, countPresentSignals } = require('./runtimePayloadUtils');
const { analyzeOperationalSignalIntegrity } = require('./operationalSignalIntegrityAnalyzer');

function measureContextualDataDensity(payload, ctx = {}) {
  const kpis = extractKpiList(payload);
  const modules = extractModules(payload);
  const widgets = extractWidgets(payload);
  const signals = analyzeOperationalSignalIntegrity(payload, ctx);
  const phaseSignals = countPresentSignals(ctx);

  const entityCount = kpis.length + modules.length + widgets.length;
  const operational_density = Number(
    Math.min(1, entityCount / 8 + signals.signal_integrity_score * 0.4 + phaseSignals * 0.05).toFixed(4)
  );
  const contextual_richness = Number(
    ((operational_density + (ctx.contextual_delivery?.contextual_delivery_confidence ?? 0.75)) / 2).toFixed(4)
  );
  const semantic_usefulness = Number(
    ((signals.signal_integrity_score + contextual_richness) / 2).toFixed(4)
  );
  const insight_feeding_quality = Number(
    (ctx.decision_reliability?.runtime_decision_confidence ?? semantic_usefulness).toFixed(4)
  );
  const runtime_density_score = Number(
    ((operational_density + contextual_richness + semantic_usefulness) / 3).toFixed(4)
  );

  if (runtime_density_score < 0.55 && phaseX.isRuntimeEnrichmentObservabilityEnabled()) {
    logPhaseX('LOW_OPERATIONAL_DENSITY_DETECTED', { score: runtime_density_score, shadow_only: true });
  }
  if (contextual_richness < 0.6) {
    logPhaseX('LOW_CONTEXTUAL_RICHNESS', { score: contextual_richness, shadow_only: true });
  }

  return {
    runtime_density_score,
    operational_density,
    contextual_richness,
    semantic_usefulness,
    insight_feeding_quality,
    entity_count: entityCount,
    invented_metrics: false
  };
}

module.exports = { measureContextualDataDensity };
