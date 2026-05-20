'use strict';

const { logProductionRollout } = require('./productionRolloutLogger');
const { computeStabilizationMetrics } = require('./governanceStabilizationMonitor');

/**
 * Recomendações de tuning — sem aplicar automaticamente.
 */
function recommendTuning(ctx = {}) {
  const metrics = computeStabilizationMetrics(ctx);
  const recommendations = [];

  if (metrics.governance_operational_pressure > 0.15) {
    recommendations.push({
      area: 'overblocking',
      action: 'review_sanitizer_thresholds',
      auto_apply: false
    });
  }
  if (metrics.contextual_preservation_score < 0.85) {
    recommendations.push({
      area: 'context',
      action: 'review_context_sanitizer',
      auto_apply: false
    });
  }
  if (metrics.stabilization_score < 0.75) {
    recommendations.push({
      area: 'stability',
      action: 'hold_next_channel_promotion',
      auto_apply: false
    });
  }

  logProductionRollout('PRODUCTION_RUNTIME_TUNING', {
    recommendations: recommendations.length,
    tenant_id: ctx.tenant_id
  });

  return {
    recommendations,
    metrics,
    auto_applied: false,
    manual_review_required: recommendations.length > 0
  };
}

module.exports = { recommendTuning };
