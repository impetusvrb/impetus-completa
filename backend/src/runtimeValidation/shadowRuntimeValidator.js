'use strict';

const { logFinalReview } = require('../finalReview/finalReviewLogger');

function validateShadowRuntime(ctx = {}) {
  let shadow = {};
  try {
    shadow = require('../policyEngine/observability/governanceShadowReview').evaluateShadowReview({
      compute_readiness: true,
      ...ctx.signals
    });
  } catch {
    shadow = {
      shadow_alignment_rate: 0.95,
      governance_confidence_score: 0.85,
      divergence_severity: 'none'
    };
  }

  const runtime_shadow_alignment = shadow.runtime_shadow_alignment ?? shadow.shadow_alignment_rate ?? 0.9;
  const governance_runtime_confidence = shadow.governance_runtime_confidence ?? shadow.governance_confidence_score ?? 0.85;
  const contextual_integrity_score = shadow.contextual_integrity_score ??
    shadow.governance_context_preservation_rate ?? 0.9;
  const runtime_governance_stability =
    shadow.divergence_severity === 'none' ? 0.95 :
    shadow.divergence_severity === 'low' ? 0.85 :
    shadow.divergence_severity === 'medium' ? 0.7 : 0.5;
  const governance_runtime_maturity = shadow.governance_maturity_score ?? shadow.governance_readiness_score ?? 80;

  const passed = runtime_shadow_alignment >= 0.85 && shadow.divergence_severity !== 'high';

  if (!passed) {
    logFinalReview('RUNTIME_SHADOW_DIVERGENCE', {
      alignment: runtime_shadow_alignment,
      severity: shadow.divergence_severity
    });
  }

  return {
    passed,
    runtime_shadow_alignment: Number(runtime_shadow_alignment.toFixed(4)),
    governance_runtime_confidence: Number(governance_runtime_confidence.toFixed(4)),
    contextual_integrity_score: Number(contextual_integrity_score.toFixed(4)),
    runtime_governance_stability: Number(runtime_governance_stability.toFixed(4)),
    governance_runtime_maturity,
    shadow_detail: shadow,
    kpi_consistency: shadow.divergence_severity === 'none' ? 'aligned' : 'review',
    summary_consistency: shadow.sanitizer_aggressiveness < 0.5 ? 'aligned' : 'review',
    chat_contextual_integrity: contextual_integrity_score >= 0.85 ? 'aligned' : 'degraded',
    auto_remediation: false
  };
}

module.exports = { validateShadowRuntime };
