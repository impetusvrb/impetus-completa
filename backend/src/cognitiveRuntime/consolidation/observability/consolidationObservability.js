'use strict';

const c0c1 = require('../../config/phaseC0C1FeatureFlags');

function emitConsolidationEvent(type, meta = {}) {
  if (!c0c1.isCognitiveAuthorityObservabilityEnabled()) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), type, ...meta });
  switch (type) {
    case 'AUTHORITY_RESOLVED':
    case 'FALLBACK_DOMINANCE':
    case 'FRAGMENTATION_DETECTED':
    case 'RUNTIME_CONFLICT':
    case 'FRONTEND_DIVERGENCE':
      console.info(`[COGNITIVE_CONSOLIDATION] ${type}`, line);
      break;
    default:
      console.info(`[COGNITIVE_CONSOLIDATION] ${type}`, line);
  }
}

function buildConsolidationObservabilityMetrics(summary = {}) {
  return {
    authority_score: summary.cognitive_authority_score ?? 0,
    runtime_alignment: summary.frontend_runtime_alignment ?? 0,
    cognitive_fragmentation: summary.fragmentation_score ?? 0,
    cockpit_authority_ratio: summary.cockpit_authority_ratio ?? 0,
    fallback_pressure: summary.fallback_dominance_ratio ?? 0,
    runtime_governance_stability: summary.runtime_governance_stability ?? 'unknown'
  };
}

module.exports = { emitConsolidationEvent, buildConsolidationObservabilityMetrics };
