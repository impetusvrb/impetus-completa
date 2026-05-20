'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isSummaryGovernanceRolloutEnabled: () => _flag('IMPETUS_SUMMARY_GOVERNANCE_ROLLOUT', false),
  isSummarySemanticStabilizationEnabled: () => _flag('IMPETUS_SUMMARY_SEMANTIC_STABILIZATION', false),
  isSummaryRelevanceEngineEnabled: () => _flag('IMPETUS_SUMMARY_RELEVANCE_ENGINE', false),
  isSummaryDeliveryPrecisionEnabled: () => _flag('IMPETUS_SUMMARY_DELIVERY_PRECISION', false),
  isSummaryGovernanceObservabilityEnabled: () => _flag('IMPETUS_SUMMARY_GOVERNANCE_OBSERVABILITY', true),
  isSummaryGovernanceChannelEnabled: () => _flag('IMPETUS_SUMMARY_GOVERNANCE', false)
};
