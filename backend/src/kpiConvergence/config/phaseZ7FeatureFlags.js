'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isKpiRuntimeConvergenceEnabled: () => _flag('IMPETUS_KPI_RUNTIME_CONVERGENCE', false),
  isExecutiveOperationalAssuranceEnabled: () => _flag('IMPETUS_EXECUTIVE_OPERATIONAL_ASSURANCE', false),
  isKpiBlindnessDetectionEnabled: () => _flag('IMPETUS_KPI_BLINDNESS_DETECTION', false),
  isKpiGovernanceHealthEnabled: () => _flag('IMPETUS_KPI_GOVERNANCE_HEALTH', false),
  isKpiConvergenceObservabilityEnabled: () => _flag('IMPETUS_KPI_CONVERGENCE_OBSERVABILITY', true)
};
