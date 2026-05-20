'use strict';

const finalFlags = require('./config/finalReviewFeatureFlags');
const { logFinalReview } = require('./finalReviewLogger');
const { auditCoverage } = require('./governanceCoverageAudit');
const { auditRegression } = require('./governanceRegressionAudit');
const { assessGovernanceHealth } = require('./governanceHealthAssessment');
const { finalizeReadiness } = require('./governanceReadinessFinalizer');

/**
 * Revisão integrada E→J — sem activação automática.
 */
function runIntegratedReview(ctx = {}) {
  if (!finalFlags.isFinalGovernanceReviewEnabled() && !ctx.force) {
    return {
      enabled: false,
      message: 'IMPETUS_FINAL_GOVERNANCE_REVIEW=off',
      auto_activation: false
    };
  }

  logFinalReview('FINAL_GOVERNANCE_REVIEW_STARTED', { tenant_id: ctx.tenant_id || null });

  const coverage = auditCoverage(ctx);
  const regression = auditRegression(ctx);
  const health = assessGovernanceHealth(ctx);
  const final_score = finalizeReadiness(ctx);

  const review = {
    enabled: true,
    completed_at: new Date().toISOString(),
    coverage_matrix: coverage,
    regression_audit: regression,
    health_assessment: health,
    final_readiness: final_score,
    flags: {
      final_review: finalFlags.isFinalGovernanceReviewEnabled(),
      runtime_validation: finalFlags.isRuntimeValidationEnabled(),
      rollout_safety: finalFlags.isRolloutSafetyValidationEnabled()
    },
    auto_activation: false,
    global_governance_active: false
  };

  logFinalReview('FINAL_GOVERNANCE_REVIEW_COMPLETED', {
    governance_health: final_score.governance_health,
    production_status: final_score.production_status,
    regression_count: regression.regression_count
  });

  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({
      type: 'final_integrated_review',
      governance_health: final_score.governance_health,
      production_status: final_score.production_status
    });
  } catch {
    /* optional */
  }

  return review;
}

module.exports = { runIntegratedReview };
