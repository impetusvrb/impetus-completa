'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isContextualEnforcementPreparationEnabled: () => _flag('IMPETUS_CONTEXTUAL_ENFORCEMENT_PREPARATION', false),
  isCanonicalDeliveryMatrixEnabled: () => _flag('IMPETUS_CANONICAL_DELIVERY_MATRIX', false),
  isTenantDeliveryProfilingEnabled: () => _flag('IMPETUS_TENANT_DELIVERY_PROFILING', false),
  isDashboardDensityGovernanceEnabled: () => _flag('IMPETUS_DASHBOARD_DENSITY_GOVERNANCE', false),
  isContextualPruningSimulationEnabled: () => _flag('IMPETUS_CONTEXTUAL_PRUNING_SIMULATION', false),
  isContextualEnforcementObservabilityEnabled: () => _flag('IMPETUS_CONTEXTUAL_ENFORCEMENT_OBSERVABILITY', true)
};
