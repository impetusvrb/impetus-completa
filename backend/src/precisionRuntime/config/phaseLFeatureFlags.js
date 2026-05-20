'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isPreciseModuleDeliveryEnabled: () => _flag('IMPETUS_PRECISE_MODULE_DELIVERY', false),
  isPreciseToolExposureEnabled: () => _flag('IMPETUS_PRECISE_TOOL_EXPOSURE', false),
  isPreciseWidgetGovernanceEnabled: () => _flag('IMPETUS_PRECISE_WIDGET_GOVERNANCE', false),
  isPreciseKpiAlignmentEnabled: () => _flag('IMPETUS_PRECISE_KPI_ALIGNMENT', false),
  isPreciseSummaryEngineEnabled: () => _flag('IMPETUS_PRECISE_SUMMARY_ENGINE', false),
  isRuntimePrecisionObservabilityEnabled: () => _flag('IMPETUS_RUNTIME_PRECISION_OBSERVABILITY', true)
};
