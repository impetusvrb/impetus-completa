'use strict';

const telemetry = require('./governanceTelemetry');
const shadowReview = require('./governanceShadowReview');
const driftDetector = require('../../oversight/governanceDriftDetector');

function getEnterpriseMetrics() {
  const base = telemetry.getSnapshot();
  const drift = driftDetector.detectDrift();
  const shadow = shadowReview.evaluateShadowReview({
    legacy_module_count: 8,
    governed_module_count: 8,
    compute_readiness: true
  });
  const metrics = {
    ...base,
    governance_confidence_score: shadow.governance_confidence_score ?? 0.85,
    shadow_alignment_rate: shadow.shadow_alignment_rate ?? 1 - (base.shadow_divergence_rate || 0),
    sanitizer_aggressiveness: shadow.sanitizer_aggressiveness ?? (base.sanitized_context_rate || 0),
    policy_consistency_rate: shadow.policy_consistency_rate ?? 1 - (base.governance_conflict_rate || 0),
    exposure_stability_score: shadow.exposure_stability_score ?? 1 - (base.denied_exposure_rate || 0) * 0.5,
    governance_drift_rate: drift.rates?.deny_rate || 0,
    drift_signals: drift.signals || [],
    shadow_mode_active: require('../config/phaseFFeatureFlags').isGovernanceShadowModeEnabled(),
    governance_readiness_score: shadow.governance_readiness_score,
    activation_safety_score: shadow.activation_safety_score,
    governance_maturity_score: shadow.governance_maturity_score,
    governance_false_positive_rate: shadow.governance_false_positive_rate,
    governance_overblocking_rate: shadow.governance_overblocking_rate,
    governance_context_preservation_rate: shadow.governance_context_preservation_rate
  };
  return metrics;
}

module.exports = { getEnterpriseMetrics, evaluateShadowReview: shadowReview.evaluateShadowReview };
