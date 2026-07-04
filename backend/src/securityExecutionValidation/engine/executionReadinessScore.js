'use strict';

/**
 * SEC-12 — Execution Readiness Score (0–1).
 */

function computeExecutionReadinessScore(context) {
  const {
    validations = [],
    dryRuns = [],
    approvalValidation = null,
    sec11Dashboard = null
  } = context;

  if (validations.length === 0) return { score: 0, factors: { reason: 'no_actions' } };

  let score = 1.0;
  const factors = {};

  const validCount = validations.filter((v) => v.verdict === 'VALID').length;
  const highRiskCount = validations.filter((v) => v.verdict === 'HIGH_RISK').length;
  const blockedCount = validations.filter((v) => v.verdict === 'BLOCKED' || v.verdict === 'INVALID').length;

  factors.validRatio = validCount / validations.length;
  score *= 0.3 + factors.validRatio * 0.4;

  if (blockedCount > 0) {
    factors.blockedPenalty = blockedCount / validations.length;
    score -= factors.blockedPenalty * 0.3;
  }
  if (highRiskCount > 0) {
    factors.highRiskPenalty = highRiskCount / validations.length;
    score -= factors.highRiskPenalty * 0.15;
  }

  const rollbackOk = validations.filter((v) => v.rollback?.valid).length;
  factors.rollbackRatio = rollbackOk / validations.length;
  score *= 0.5 + factors.rollbackRatio * 0.5;

  if (approvalValidation && !approvalValidation.valid) {
    factors.approvalPenalty = 0.2;
    score -= 0.2;
  } else if (approvalValidation?.valid) {
    factors.approvalBonus = 0.05;
    score += 0.05;
  }

  const canDrop = dryRuns.some((d) => d.availability_impact === 'POSSIBLE_DEGRADATION');
  if (canDrop) {
    factors.availabilityPenalty = 0.15;
    score -= 0.15;
  }

  if (sec11Dashboard?.recommendedProfile === 'LOCKDOWN') {
    factors.lockdownPenalty = 0.1;
    score -= 0.1;
  }

  return {
    execution_readiness_score: Math.min(1, Math.max(0, score)),
    factors,
    readyForSec13: score >= 0.75 && blockedCount === 0 && approvalValidation?.valid === true
  };
}

module.exports = { computeExecutionReadinessScore };
