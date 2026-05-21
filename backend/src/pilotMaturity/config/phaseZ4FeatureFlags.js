'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isPilotMaturityEngineEnabled: () => _flag('IMPETUS_PILOT_MATURITY_ENGINE', false),
  isMenuStabilityAnalysisEnabled: () => _flag('IMPETUS_MENU_STABILITY_ANALYSIS', false),
  isKpiEnforcementPreparationEnabled: () => _flag('IMPETUS_KPI_ENFORCEMENT_PREPARATION', false),
  isDeliveryQualityAnalysisEnabled: () => _flag('IMPETUS_DELIVERY_QUALITY_ANALYSIS', false),
  isTargetingConvergenceValidationEnabled: () => _flag('IMPETUS_TARGETING_CONVERGENCE_VALIDATION', false),
  isPilotObservabilityEnabled: () => _flag('IMPETUS_PILOT_OBSERVABILITY', true)
};
