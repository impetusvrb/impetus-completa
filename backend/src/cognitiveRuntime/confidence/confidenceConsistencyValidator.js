'use strict';

function validateConfidenceConsistency(confidence = {}, memory = {}, graph = {}) {
  const weak_dimensions = [];
  if (confidence.narrative_confidence > 0.7 && (memory.causal_density ?? 0) < 0.4) {
    weak_dimensions.push('narrative_without_causal_density');
  }
  if (confidence.causal_confidence > 0.8 && (graph.node_count ?? 0) < 5) {
    weak_dimensions.push('high_causal_sparse_graph');
  }
  if (confidence.statistical_confidence > 0.85 && (memory.verified_operational_memory ?? 0) < 2) {
    weak_dimensions.push('statistical_without_history');
  }
  if (confidence.unified_confidence_score > 0.8 && weak_dimensions.length >= 2) {
    weak_dimensions.push('unified_inflated');
  }

  const inflated_confidence_detected = weak_dimensions.includes('unified_inflated') || weak_dimensions.length >= 2;
  const fallback_confidence_applied = inflated_confidence_detected
    ? Number(Math.min(confidence.unified_confidence_score, 0.65).toFixed(3))
    : confidence.unified_confidence_score;

  return {
    confidence_integrity: weak_dimensions.length === 0 ? 'valid' : 'degraded',
    weak_dimensions,
    inflated_confidence_detected,
    fallback_confidence_applied,
    auto_mutation: false
  };
}

module.exports = { validateConfidenceConsistency };
