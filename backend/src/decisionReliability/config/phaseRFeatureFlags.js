'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isDecisionReliabilityEnabled: () => _flag('IMPETUS_DECISION_RELIABILITY', false),
  isOperationalTrustEngineEnabled: () => _flag('IMPETUS_OPERATIONAL_TRUST_ENGINE', false),
  isRecommendationQualityAnalysisEnabled: () => _flag('IMPETUS_RECOMMENDATION_QUALITY_ANALYSIS', false),
  isDecisionStabilityEngineEnabled: () => _flag('IMPETUS_DECISION_STABILITY_ENGINE', false),
  isHumanOversightReliabilityEnabled: () => _flag('IMPETUS_HUMAN_OVERSIGHT_RELIABILITY', false),
  isDecisionReliabilityObservabilityEnabled: () => _flag('IMPETUS_DECISION_RELIABILITY_OBSERVABILITY', true)
};
