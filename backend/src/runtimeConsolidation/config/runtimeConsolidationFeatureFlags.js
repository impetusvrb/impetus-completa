'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isRuntimeConsolidationEnabled: () => _flag('IMPETUS_RUNTIME_CONSOLIDATION', false),
  isLegacyReductionAnalysisEnabled: () => _flag('IMPETUS_LEGACY_REDUCTION_ANALYSIS', false),
  isRuntimeConsolidationObservabilityEnabled: () => _flag('IMPETUS_RUNTIME_CONSOLIDATION_OBSERVABILITY', true)
};
