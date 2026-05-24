'use strict';

function analyzeOperationalDensity(events = [], options = {}) {
  const real = events.filter((e) => e.verification_state !== 'synthetic');
  const synthetic = events.filter((e) => e.verification_state === 'synthetic');
  const total = events.length;

  const domains = new Set(events.map((e) => e.domain));
  const withCausal = events.filter((e) => (e.causal_chain?.length ?? 0) >= 1);

  const timestamps = events.map((e) => new Date(e.created_at).getTime()).filter((n) => !Number.isNaN(n));
  let timeline_continuity = 0;
  if (timestamps.length >= 2) {
    timestamps.sort((a, b) => a - b);
    const span = timestamps[timestamps.length - 1] - timestamps[0];
    timeline_continuity = span > 0 ? Math.min(1, total / (span / 3600000 + 1)) : 0.5;
  }

  const operational_event_density = Number((total / Math.max(options.window_hours || 24, 1)).toFixed(3));
  const causal_density = Number((withCausal.length / Math.max(total, 1)).toFixed(3));
  const memory_depth = Math.min(1, total / 50);
  const inferential_support_score = Number(
    Math.min(1, causal_density * 0.5 + (domains.size / 4) * 0.3 + timeline_continuity * 0.2).toFixed(3)
  );
  const synthetic_vs_real_ratio = Number((synthetic.length / Math.max(total, 1)).toFixed(3));

  return {
    operational_event_density,
    causal_density,
    timeline_continuity: Number(timeline_continuity.toFixed(3)),
    memory_depth: Number(memory_depth.toFixed(3)),
    inferential_support_score,
    synthetic_vs_real_ratio,
    real_event_count: real.length,
    synthetic_event_count: synthetic.length,
    domain_coverage: [...domains]
  };
}

function buildEventDensityRuntime(events = {}, synthetic = {}) {
  const all = [...(events.events || events), ...(synthetic.events || [])];
  const density = analyzeOperationalDensity(all);
  return {
    ...density,
    synthetic_generated: synthetic.synthetic_count || 0,
    auto_mutation: false
  };
}

module.exports = { analyzeOperationalDensity, buildEventDensityRuntime };
