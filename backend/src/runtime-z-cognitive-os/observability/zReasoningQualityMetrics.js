'use strict';

function computeReasoningQualityMetrics(reasoning = {}) {
  return {
    reasoning_quality: reasoning?.reasoning_quality || 0,
    industrial_intelligence_score: reasoning?.industrial_intelligence_score || 0,
    priority_tier: reasoning?.priority?.tier || 'P4',
    criticality_level: reasoning?.criticality?.level || 'low',
    detected_risks: reasoning?.detected_risks || []
  };
}

module.exports = { computeReasoningQualityMetrics };
