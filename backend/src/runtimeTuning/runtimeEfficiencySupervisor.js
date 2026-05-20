'use strict';

const flags = require('./config/runtimeTuningFeatureFlags');
const { logRuntimeTuning } = require('./runtimeTuningLogger');

function superviseRuntimeEfficiency(ctx = {}) {
  const shadowLayers = [
    ctx.runtime_enrichment,
    ctx.precision_delivery,
    ctx.contextual_delivery,
    ctx.runtime_consistency,
    ctx.runtime_calibration,
    ctx.cognitive_convergence
  ].filter(Boolean).length;

  const overhead = Number(Math.min(0.45, shadowLayers * 0.06).toFixed(4));
  const usefulness =
    ctx.operational_usefulness?.aggregate_operational_usefulness ??
    ctx.runtime_calibration?.operational_maturity?.composite_maturity ??
    0.8;

  const enrichment_cost = ctx.runtime_enrichment?.low_density
    ? 0.35
    : Number((1 - (ctx.enrichment_integrity?.enrichment_integrity_score ?? 0.85)).toFixed(4));

  const cognitive_load = Number(
    Math.min(1, overhead + enrichment_cost * 0.4 + (1 - usefulness) * 0.3).toFixed(4)
  );

  const efficiency = Number(Math.max(0.35, usefulness - overhead - enrichment_cost * 0.2).toFixed(4));

  if (efficiency < 0.62 && flags.isRuntimeTuningObservabilityEnabled()) {
    logRuntimeTuning('RUNTIME_EFFICIENCY_DEGRADED', {
      efficiency,
      cognitive_load,
      tenant_id: ctx.tenant_id,
      shadow_only: true
    });
  }

  return {
    efficiency_score: efficiency,
    runtime_overhead: overhead,
    enrichment_cost,
    cognitive_load,
    shadow_layer_count: shadowLayers,
    sustainable: efficiency >= 0.72 && cognitive_load < 0.65,
    auto_apply: false
  };
}

module.exports = { superviseRuntimeEfficiency };
