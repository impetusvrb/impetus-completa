'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isGovernanceReadinessEnabled: () => _flag('IMPETUS_GOVERNANCE_READINESS', false),
  isGovernanceQualityGatesEnabled: () => _flag('IMPETUS_GOVERNANCE_QUALITY_GATES', false),
  isGovernanceActivationPlannerEnabled: () => _flag('IMPETUS_GOVERNANCE_ACTIVATION_PLANNER', false),
  isGovernanceFalsePositiveAnalyzerEnabled: () => _flag('IMPETUS_GOVERNANCE_FALSE_POSITIVE_ANALYZER', false)
};
