'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isCognitiveConvergenceEnabled: () => _flag('IMPETUS_COGNITIVE_CONVERGENCE', true),
  isQualityControlledAuthorityEnabled: () => _flag('IMPETUS_C2_QUALITY_CONTROLLED_AUTHORITY', true),
  isOperationalContextEngineEnabled: () => _flag('IMPETUS_C2_OPERATIONAL_CONTEXT', true),
  isInferenceValidationEnabled: () => _flag('IMPETUS_C2_INFERENCE_VALIDATION', true),
  isEventDensityEngineEnabled: () => _flag('IMPETUS_C2_EVENT_DENSITY', true),
  isFallbackReductionEnabled: () => _flag('IMPETUS_C2_FALLBACK_REDUCTION', true),
  isC2ObservabilityEnabled: () => _flag('IMPETUS_C2_OBSERVABILITY', true),
  syntheticEventsWhenSparse: () => _flag('IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE', true),
  autoRemediation: false,
  autoDecisions: false,
  authoritativeGlobal: false,
  maxTimelineEvents: () => {
    const v = Number(process.env.IMPETUS_C2_MAX_TIMELINE_EVENTS);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 500) : 120;
  }
};
