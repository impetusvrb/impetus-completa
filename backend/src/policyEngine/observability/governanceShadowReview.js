'use strict';

const phaseF = require('../config/phaseFFeatureFlags');
const { logPhaseG } = require('../../explainability/phaseGLogger');

/**
 * Shadow review expandido (Fase G) — métricas de qualidade shadow vs governado.
 */
function evaluateShadowReview(ctx = {}) {
  const {
    legacy_module_count = 0,
    governed_module_count = 0,
    legacy_kpi_count = 0,
    governed_kpi_count = 0,
    legacy_ai = true,
    governed_ai = true,
    sanitizer_stripped = 0
  } = ctx;

  const moduleDelta = Math.abs(legacy_module_count - governed_module_count);
  const kpiDelta = Math.abs(legacy_kpi_count - governed_kpi_count);
  const aiMismatch = legacy_ai !== governed_ai;

  let divergence_severity = 'none';
  if (moduleDelta > 2 || kpiDelta > 3) divergence_severity = 'high';
  else if (moduleDelta > 0 || kpiDelta > 0 || aiMismatch) divergence_severity = 'medium';
  else if (sanitizer_stripped > 5) divergence_severity = 'low';

  const shadow_alignment_rate =
    legacy_module_count + governed_module_count > 0 ?
      1 - moduleDelta / Math.max(legacy_module_count, governed_module_count, 1) :
      1;

  const sanitizer_aggressiveness = Math.min(1, sanitizer_stripped / 10);
  const governance_confidence_score = Number(
    (shadow_alignment_rate * 0.5 + (aiMismatch ? 0.3 : 1) * 0.3 + (1 - sanitizer_aggressiveness) * 0.2).toFixed(4)
  );

  const contextual_consistency = divergence_severity === 'none' ? 'aligned' : 'divergent';

  const governance_false_positive_rate =
    ctx.false_positive_rate ??
    (divergence_severity === 'medium' && !aiMismatch ? 0.06 : divergence_severity === 'high' ? 0.12 : 0.02);
  const governance_overblocking_rate =
    ctx.overblocking_rate ?? Math.min(1, sanitizer_aggressiveness * 0.6 + (moduleDelta > 2 ? 0.2 : 0));
  const governance_context_preservation_rate = Number(
    (1 - sanitizer_aggressiveness * 0.7 - (kpiDelta > 2 ? 0.15 : 0)).toFixed(4)
  );

  let governance_readiness_score = null;
  let activation_safety_score = null;
  let governance_maturity_score = null;
  let tenant_readiness_score = null;
  try {
    const phaseH = require('../../governanceReadiness/config/phaseHFeatureFlags');
    if (phaseH.isGovernanceReadinessEnabled() || ctx.compute_readiness) {
      const scorer = require('../../governanceReadiness/governanceReadinessScorer');
      const base = {
        shadow_alignment_rate,
        governance_confidence_score,
        governance_false_positive_rate,
        governance_overblocking_rate,
        governance_context_preservation_rate,
        drift_stability: divergence_severity === 'none' ? 'stable' : 'watch'
      };
      governance_readiness_score = scorer.computeReadinessScore(base);
      activation_safety_score = scorer.computeActivationSafetyScore(base);
      governance_maturity_score = scorer.computeGovernanceMaturityScore(base);
      tenant_readiness_score = governance_readiness_score;
    }
  } catch {
    /* optional */
  }

  const runtime_shadow_alignment = Number(shadow_alignment_rate.toFixed(4));
  const governance_runtime_confidence = governance_confidence_score;
  const contextual_integrity_score = governance_context_preservation_rate;
  const runtime_governance_stability = Number(
    (divergence_severity === 'none' ? 0.95 : divergence_severity === 'low' ? 0.85 : divergence_severity === 'medium' ? 0.7 : 0.5).toFixed(4)
  );
  const governance_runtime_maturity = governance_maturity_score ?? governance_readiness_score ?? null;

  const metrics = {
    governance_confidence_score,
    shadow_alignment_rate: runtime_shadow_alignment,
    runtime_shadow_alignment,
    governance_runtime_confidence,
    contextual_integrity_score,
    runtime_governance_stability,
    governance_runtime_maturity,
    sanitizer_aggressiveness: Number(sanitizer_aggressiveness.toFixed(4)),
    policy_consistency_rate: aiMismatch ? 0.7 : 0.95,
    exposure_stability_score: Number((1 - moduleDelta / 10).toFixed(4)),
    governance_drift_rate: divergence_severity === 'high' ? 0.8 : divergence_severity === 'medium' ? 0.4 : 0.05,
    divergence_severity,
    contextual_consistency,
    governance_readiness_score,
    activation_safety_score,
    governance_maturity_score,
    tenant_readiness_score,
    governance_false_positive_rate,
    governance_overblocking_rate,
    governance_context_preservation_rate,
    leakage_prevention: divergence_severity === 'high' ? 'at_risk' : 'effective',
    kpi_consistency: kpiDelta === 0 ? 'aligned' : 'divergent',
    summary_consistency: sanitizer_aggressiveness < 0.5 ? 'aligned' : 'review',
    chat_contextual_integrity: contextual_integrity_score >= 0.85 ? 'aligned' : 'degraded'
  };

  if (phaseF.isGovernanceShadowModeEnabled() && divergence_severity !== 'none') {
    logPhaseG('COGNITIVE_GOVERNANCE_SHADOW_REVIEW', metrics);
  }

  return metrics;
}

module.exports = { evaluateShadowReview };
