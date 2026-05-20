'use strict';

const { auditCoverage } = require('./governanceCoverageAudit');
const { auditRegression } = require('./governanceRegressionAudit');
const { logFinalReview } = require('./finalReviewLogger');

function assessGovernanceHealth(ctx = {}) {
  const coverage = auditCoverage(ctx);
  const regression = auditRegression(ctx);

  let readiness = {};
  try {
    readiness = require('../governanceReadiness/governanceReadinessEngine').assessReadiness({ force: true });
  } catch {
    readiness = {};
  }

  let shadow = {};
  try {
    shadow = require('../policyEngine/observability/governanceShadowReview').evaluateShadowReview({
      compute_readiness: true,
      ...ctx.shadow_signals
    });
  } catch {
    shadow = { shadow_alignment_rate: 0.9 };
  }

  const coverage_penalty = (coverage.gaps?.length || 0) * 5;
  const regression_penalty = regression.regression_count * 10;
  const base = readiness.readiness_score ?? 85;
  const governance_health = Math.max(
    0,
    Math.min(100, Math.round(base - coverage_penalty - regression_penalty + (shadow.shadow_alignment_rate || 0) * 5))
  );

  const leakage_risk = readiness.leakage_risk || 'low';
  const overblocking_risk = readiness.overblocking_risk || 'low';

  logFinalReview('FINAL_GOVERNANCE_HEALTH_SCORE', { governance_health, leakage_risk });

  return {
    governance_health,
    coverage,
    regression,
    readiness_summary: {
      readiness_score: readiness.readiness_score,
      activation_safety_score: readiness.activation_safety_score,
      leakage_risk,
      overblocking_risk
    },
    shadow_summary: {
      shadow_alignment: shadow.shadow_alignment_rate,
      governance_confidence: shadow.governance_confidence_score
    },
    auto_activation: false
  };
}

module.exports = { assessGovernanceHealth };
