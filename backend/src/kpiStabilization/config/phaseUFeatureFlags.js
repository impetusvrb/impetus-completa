'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isKpiRuntimeStabilizationEnabled: () => _flag('IMPETUS_KPI_RUNTIME_STABILIZATION', false),
  isKpiSemanticAlignmentEnabled: () => _flag('IMPETUS_KPI_SEMANTIC_ALIGNMENT', false),
  isKpiHierarchyStabilizationEnabled: () => _flag('IMPETUS_KPI_HIERARCHY_STABILIZATION', false),
  isKpiDeliveryPrecisionSupervisionEnabled: () => _flag('IMPETUS_KPI_DELIVERY_PRECISION_SUPERVISION', false),
  isKpiStabilizationObservabilityEnabled: () => _flag('IMPETUS_KPI_STABILIZATION_OBSERVABILITY', true)
};
