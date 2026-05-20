'use strict';

const phaseN = require('./config/phaseNFeatureFlags');

function recommendCalibration(report = {}) {
  const recommendations = [];
  if ((report.runtime_entropy_score ?? 0) > 0.35) {
    recommendations.push({
      priority: 'high',
      action: 'reduce_fallback_and_fragmentation',
      reason: 'Entropia cognitiva elevada'
    });
  }
  if ((report.runtime_stability ?? 1) < 0.72) {
    recommendations.push({
      priority: 'high',
      action: 'stabilize_context_composition',
      reason: 'Instabilidade runtime detectada'
    });
  }
  if ((report.drift?.drift_detected)) {
    recommendations.push({
      priority: 'medium',
      action: 'review_axis_consistency',
      reason: 'Drift contextual acumulado'
    });
  }
  if ((report.cognitive_operational_pressure ?? 0) > 0.6) {
    recommendations.push({
      priority: 'medium',
      action: 'reduce_governance_layer_overlap',
      reason: 'Pressão operacional cognitiva'
    });
  }

  return {
    recommendations,
    auto_execute: false,
    observe_only: !phaseN.isGovernanceCalibrationEnabled(),
    shadow_only: !phaseN.isGovernanceCalibrationEnabled()
  };
}

module.exports = { recommendCalibration };
