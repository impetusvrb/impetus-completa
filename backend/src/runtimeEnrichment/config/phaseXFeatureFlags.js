'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isRuntimeEnrichmentEnabled: () => _flag('IMPETUS_RUNTIME_ENRICHMENT', false),
  isOperationalSignalAnalysisEnabled: () => _flag('IMPETUS_OPERATIONAL_SIGNAL_ANALYSIS', false),
  isContextualDensityEngineEnabled: () => _flag('IMPETUS_CONTEXTUAL_DENSITY_ENGINE', false),
  isDashboardEnrichmentEnabled: () => _flag('IMPETUS_DASHBOARD_ENRICHMENT', false),
  isTelemetryGapDetectionEnabled: () => _flag('IMPETUS_TELEMETRY_GAP_DETECTION', false),
  isRuntimeEnrichmentObservabilityEnabled: () => _flag('IMPETUS_RUNTIME_ENRICHMENT_OBSERVABILITY', true)
};
