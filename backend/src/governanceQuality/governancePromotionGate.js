'use strict';

const { evaluateQualityGate } = require('./governanceQualityGate');

function evaluatePromotionGate(readiness, opts = {}) {
  const gate = evaluateQualityGate(readiness, opts);
  if (gate.skipped && !opts.force) {
    return {
      allowed: false,
      reason: 'quality_gates_disabled',
      recommendation: 'enable_IMPETUS_GOVERNANCE_QUALITY_GATES_for_promotion_checks'
    };
  }
  if (gate.skipped && opts.force) {
    return {
      allowed: (readiness.readiness_score ?? 0) >= 75,
      reason: 'quality_gate_forced_readiness_only',
      auto_promotion: false,
      manual_confirmation_required: true
    };
  }
  if (!gate.passed) {
    return {
      allowed: false,
      reason: 'quality_gate_failed',
      failures: gate.failures,
      auto_promotion: false
    };
  }
  if ((readiness.readiness_score ?? 0) < 75) {
    return { allowed: false, reason: 'readiness_score_below_minimum', score: readiness.readiness_score };
  }
  return {
    allowed: true,
    reason: 'quality_gate_passed',
    auto_promotion: false,
    manual_confirmation_required: true
  };
}

module.exports = { evaluatePromotionGate };
