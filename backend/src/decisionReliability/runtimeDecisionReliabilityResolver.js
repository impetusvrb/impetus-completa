'use strict';

const { scoreDecisionQuality } = require('./cognitiveDecisionQualityEngine');
const { evaluateOperationalTrust } = require('./operationalTrustEvaluator');

function resolveDecisionReliability(signals = {}) {
  const quality = scoreDecisionQuality(signals);
  const trust = evaluateOperationalTrust({ ...signals, contextual_confidence: quality });
  const cognitive_decision_reliability = Number(((quality + trust.operational_trust_score) / 2).toFixed(4));

  return {
    cognitive_decision_reliability,
    decision_quality: quality,
    trust,
    runtime_decision_confidence: Number(((cognitive_decision_reliability + trust.contextual_trust) / 2).toFixed(4))
  };
}

module.exports = { resolveDecisionReliability };
