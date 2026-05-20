'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isContextualDeliveryStabilizationEnabled: () => _flag('IMPETUS_CONTEXTUAL_DELIVERY_STABILIZATION', false),
  isHierarchyStabilizationEnabled: () => _flag('IMPETUS_HIERARCHY_STABILIZATION', false),
  isFunctionalDomainStabilizationEnabled: () => _flag('IMPETUS_FUNCTIONAL_DOMAIN_STABILIZATION', false),
  isGovernedModuleTargetingEnabled: () => _flag('IMPETUS_GOVERNED_MODULE_TARGETING', false),
  isDashboardStabilizationEnabled: () => _flag('IMPETUS_DASHBOARD_STABILIZATION', false),
  isContextualStabilizationObservabilityEnabled: () => _flag('IMPETUS_CONTEXTUAL_STABILIZATION_OBSERVABILITY', true)
};
