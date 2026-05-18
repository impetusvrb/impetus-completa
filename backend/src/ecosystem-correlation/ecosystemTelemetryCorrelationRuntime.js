'use strict';

const { clamp01 } = require('./shared/correlationHelpers');

function ecosystemTelemetryCorrelationRuntime(ctx = {}) {
  const domains = ['quality', 'safety', 'logistics', 'environment', 'production', 'maintenance'];
  const streams = ctx.telemetry_streams || {};
  const active = domains.filter((d) => streams[d] != null);
  const density = active.length / domains.length;
  const overload = density > 0.85 || (ctx.event_rate_per_min || 0) > 120;
  const fusion_score = clamp01(density * 0.6 + (ctx.contextual_match || 0) * 0.4);

  return {
    ok: true,
    active_domains: active,
    correlation_density: density,
    telemetry_overload: overload,
    telemetry_correlation_score: fusion_score,
    causation_chain: (ctx.causation_hints || []).slice(0, 5),
    contextual_explainability: {
      ok: !overload,
      summary: overload ? 'Densidade telemétrica elevada — revisar amostragem.' : 'Fusão contextual estável.'
    },
    assistive_only: true
  };
}

module.exports = { ecosystemTelemetryCorrelationRuntime };
