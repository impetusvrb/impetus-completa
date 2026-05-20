'use strict';

const phaseH = require('../governanceReadiness/config/phaseHFeatureFlags');
const { THRESHOLDS } = require('../governanceReadiness/governanceReadinessScorer');
const { logPhaseH } = require('../governanceReadiness/phaseHLogger');

/**
 * Quality gate base — impede activação insegura.
 */
function evaluateQualityGate(readiness = {}, opts = {}) {
  if (!phaseH.isGovernanceQualityGatesEnabled() && !opts.force) {
    return { enabled: false, passed: true, skipped: true };
  }

  const failures = [];
  const shadow = readiness.shadow_alignment_rate ?? 1;
  const confidence = readiness.governance_confidence_score ?? 0;
  const fp = readiness.governance_false_positive_rate ?? 0;
  const ob = readiness.governance_overblocking_rate ?? 0;

  if (shadow < THRESHOLDS.shadow_alignment_min) {
    failures.push({
      code: 'shadow_alignment_low',
      value: shadow,
      threshold: THRESHOLDS.shadow_alignment_min
    });
  }
  if (confidence < THRESHOLDS.confidence_min) {
    failures.push({ code: 'confidence_low', value: confidence, threshold: THRESHOLDS.confidence_min });
  }
  if (fp > THRESHOLDS.false_positive_max) {
    failures.push({ code: 'false_positive_high', value: fp, threshold: THRESHOLDS.false_positive_max });
  }
  if (ob > THRESHOLDS.overblocking_max) {
    failures.push({ code: 'overblocking_high', value: ob, threshold: THRESHOLDS.overblocking_max });
  }
  if (readiness.leakage_risk === 'high') {
    failures.push({ code: 'leakage_risk_high' });
  }
  if (readiness.drift_stability === 'unstable') {
    failures.push({ code: 'drift_unstable' });
  }

  const passed = failures.length === 0;
  if (!passed) {
    logPhaseH('GOVERNANCE_ACTIVATION_BLOCKED', { failures: failures.map((f) => f.code) });
  }

  return {
    enabled: true,
    passed,
    failures,
    checked_at: new Date().toISOString()
  };
}

module.exports = { evaluateQualityGate };
