'use strict';

const phaseH = require('./config/phaseHFeatureFlags');
const { logPhaseH } = require('./phaseHLogger');
const {
  computeReadinessScore,
  computeActivationSafetyScore,
  computeGovernanceMaturityScore,
  activationRecommendation
} = require('./governanceReadinessScorer');
const { evaluateStability } = require('./governanceStabilityEvaluator');
const { analyzeRisks } = require('./governanceRiskAnalyzer');
const { analyzeFalsePositives } = require('./governanceFalsePositiveAnalyzer');
const { detectOverblocking } = require('./governanceOverblockingDetector');

let enterpriseMetrics = null;
function getMetrics() {
  if (!enterpriseMetrics) {
    try {
      enterpriseMetrics = require('../policyEngine/observability/governanceEnterpriseMetrics');
    } catch {
      enterpriseMetrics = { getEnterpriseMetrics: () => ({}) };
    }
  }
  return enterpriseMetrics.getEnterpriseMetrics();
}

/**
 * Avaliação global de readiness (não activa nada).
 */
function assessReadiness(opts = {}) {
  const baseMetrics = { ...getMetrics(), ...(opts.metrics || {}) };
  const fp = analyzeFalsePositives({ force: opts.force, ...opts.signals, total_evaluations: opts.total_evaluations || 100 });
  const ob = detectOverblocking({ force: opts.force, ...opts.signals, total_evaluations: opts.total_evaluations || 100 });

  const mergedMetrics = {
    ...baseMetrics,
    governance_false_positive_rate: fp.governance_false_positive_rate ?? fp.false_positive_rate ?? 0,
    governance_overblocking_rate: ob.governance_overblocking_rate ?? ob.overblocking_rate ?? 0,
    governance_context_preservation_rate: opts.context_preservation_rate ?? 1 - (ob.overblocking_rate || 0) * 0.5,
    trace_enabled: opts.trace_enabled ?? false,
    explainability_enabled: opts.explainability_enabled ?? false,
    telemetry_coverage: opts.telemetry_coverage ?? 0.85
  };

  const stability = evaluateStability(mergedMetrics);
  mergedMetrics.drift_stability = stability.drift_stability;

  const risks = analyzeRisks(mergedMetrics, {
    false_positives: fp.incidents,
    overblocking: ob.signals
  });

  const readiness_score = computeReadinessScore(mergedMetrics);
  const activation_safety_score = computeActivationSafetyScore({ ...mergedMetrics, ...risks });
  const governance_maturity_score = computeGovernanceMaturityScore(mergedMetrics);
  const activation_recommendation = activationRecommendation(readiness_score, risks);

  const report = {
    enabled: phaseH.isGovernanceReadinessEnabled() || opts.force,
    readiness_score,
    activation_safety_score,
    governance_maturity_score,
    shadow_alignment_rate: mergedMetrics.shadow_alignment_rate ?? 1,
    governance_confidence_score: mergedMetrics.governance_confidence_score ?? 0.85,
    governance_false_positive_rate: mergedMetrics.governance_false_positive_rate,
    governance_overblocking_rate: mergedMetrics.governance_overblocking_rate,
    governance_context_preservation_rate: mergedMetrics.governance_context_preservation_rate,
    leakage_risk: risks.leakage_risk,
    overblocking_risk: risks.overblocking_risk,
    regression_risk: risks.regression_risk,
    drift_stability: stability.drift_stability,
    shadow_quality: stability.shadow_quality,
    telemetry_maturity: stability.telemetry_maturity,
    activation_recommendation,
    auto_activation: false,
    assessed_at: new Date().toISOString(),
    false_positive_analysis: fp,
    overblocking_analysis: ob,
    stability
  };

  logPhaseH('GOVERNANCE_READINESS_ASSESSED', {
    readiness_score,
    activation_recommendation,
    leakage_risk: risks.leakage_risk,
    overblocking_risk: risks.overblocking_risk
  });

  return report;
}

module.exports = { assessReadiness, phaseH };
