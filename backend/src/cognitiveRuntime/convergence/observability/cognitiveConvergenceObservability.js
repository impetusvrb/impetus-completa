'use strict';

const c2 = require('../../config/phaseC2FeatureFlags');

function emitC2(type, meta = {}) {
  if (!c2.isC2ObservabilityEnabled()) return;
  const payload = JSON.stringify({ ts: new Date().toISOString(), ...meta });
  const tag =
    {
      CONVERGENCE_APPLIED: 'COGNITIVE_CONVERGENCE',
      QUALITY_AUTHORITY: 'QUALITY_AUTHORITY',
      OPERATIONAL_MEMORY: 'OPERATIONAL_MEMORY',
      CAUSAL_CORRELATION: 'CAUSAL_CORRELATION',
      INFERENCE_VALIDATION: 'INFERENCE_VALIDATION',
      FALLBACK_REDUCTION: 'FALLBACK_REDUCTION',
      EVENT_DENSITY: 'EVENT_DENSITY'
    }[type] || 'COGNITIVE_CONVERGENCE';
  console.info(`[${tag}] ${type}`, payload);
}

function buildC2Metrics(summary = {}) {
  return {
    fallback_dominance_ratio: summary.fallback_dominance_ratio ?? 0,
    runtime_z_effective_ratio: summary.runtime_z_effective_ratio ?? 0,
    frontend_convergence_score: summary.frontend_convergence_score ?? 0,
    memory_quality_score: summary.memory_quality_score ?? 0,
    causal_density: summary.causal_density ?? 0,
    inference_truth_score: summary.inference_truth_score ?? 0,
    operational_density: summary.operational_event_density ?? 0,
    synthetic_memory_ratio: summary.synthetic_memory_ratio ?? 0,
    runtime_authority_score: summary.runtime_authority_score ?? 0,
    verified_operational_memory_ratio: summary.verified_operational_memory_ratio ?? 0
  };
}

module.exports = { emitC2, buildC2Metrics };
