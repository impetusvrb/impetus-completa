'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isSummaryRuntimeConvergenceEnabled: () => _flag('IMPETUS_SUMMARY_RUNTIME_CONVERGENCE', false),
  isSummaryNarrativeAssuranceEnabled: () => _flag('IMPETUS_SUMMARY_NARRATIVE_ASSURANCE', false),
  isSummaryBlindnessDetectionEnabled: () => _flag('IMPETUS_SUMMARY_BLINDNESS_DETECTION', false),
  isSummaryGovernanceHealthEnabled: () => _flag('IMPETUS_SUMMARY_GOVERNANCE_HEALTH', false),
  isSummaryConvergenceObservabilityEnabled: () => _flag('IMPETUS_SUMMARY_CONVERGENCE_OBSERVABILITY', true)
};
