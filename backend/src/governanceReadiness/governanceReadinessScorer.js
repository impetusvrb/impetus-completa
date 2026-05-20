'use strict';

const THRESHOLDS = {
  shadow_alignment_min: Number(process.env.IMPETUS_READINESS_SHADOW_MIN || 0.92),
  confidence_min: Number(process.env.IMPETUS_READINESS_CONFIDENCE_MIN || 0.8),
  false_positive_max: Number(process.env.IMPETUS_READINESS_FP_MAX || 0.08),
  overblocking_max: Number(process.env.IMPETUS_READINESS_OVERBLOCK_MAX || 0.12)
};

function clamp01(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}

/**
 * Calcula readiness_score 0–100 a partir de métricas agregadas.
 */
function computeReadinessScore(metrics = {}) {
  const shadow = clamp01(metrics.shadow_alignment_rate ?? 1);
  const confidence = clamp01(metrics.governance_confidence_score ?? 0.85);
  const fpRate = clamp01(metrics.governance_false_positive_rate ?? 0);
  const obRate = clamp01(metrics.governance_overblocking_rate ?? 0);
  const contextPres = clamp01(metrics.governance_context_preservation_rate ?? 0.9);
  const driftStable = metrics.drift_stability === 'stable' ? 1 : metrics.drift_stability === 'watch' ? 0.7 : 0.4;

  const raw =
    shadow * 0.28 +
    confidence * 0.22 +
    (1 - fpRate) * 0.18 +
    (1 - obRate) * 0.17 +
    contextPres * 0.1 +
    driftStable * 0.05;

  return Math.round(clamp01(raw) * 100);
}

function activationRecommendation(score, risks = {}) {
  if (score >= 90 && risks.leakage_risk === 'low' && risks.overblocking_risk !== 'high') {
    return 'full_activation_candidate';
  }
  if (score >= 80 && risks.overblocking_risk !== 'high') {
    return 'partial_activation_safe';
  }
  if (score >= 70) {
    return 'shadow_only_continue';
  }
  if (score >= 55) {
    return 'remediate_before_activation';
  }
  return 'not_ready';
}

function computeActivationSafetyScore(metrics = {}) {
  const readiness = computeReadinessScore(metrics) / 100;
  const obPenalty = clamp01(metrics.governance_overblocking_rate ?? 0) * 0.4;
  const leakPenalty = metrics.leakage_risk === 'high' ? 0.35 : metrics.leakage_risk === 'medium' ? 0.15 : 0;
  return Number((clamp01(readiness - obPenalty - leakPenalty) * 100).toFixed(1));
}

function computeGovernanceMaturityScore(metrics = {}) {
  const hasTrace = metrics.trace_enabled ? 0.15 : 0;
  const hasExplain = metrics.explainability_enabled ? 0.15 : 0;
  const shadow = clamp01(metrics.shadow_alignment_rate ?? 0) * 0.4;
  const telemetry = clamp01(metrics.telemetry_coverage ?? 0.7) * 0.3;
  return Math.round(clamp01(shadow + telemetry + hasTrace + hasExplain) * 100);
}

module.exports = {
  computeReadinessScore,
  computeActivationSafetyScore,
  computeGovernanceMaturityScore,
  activationRecommendation,
  THRESHOLDS
};
