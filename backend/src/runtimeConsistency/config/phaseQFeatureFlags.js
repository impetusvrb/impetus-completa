'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isRuntimeConsistencyEnabled: () => _flag('IMPETUS_RUNTIME_CONSISTENCY', false),
  isInterchannelConsistencyEnabled: () => _flag('IMPETUS_INTERCHANNEL_CONSISTENCY', false),
  isTemporalContextStabilizationEnabled: () => _flag('IMPETUS_TEMPORAL_CONTEXT_STABILIZATION', false),
  isRuntimeConsistencyObservabilityEnabled: () => _flag('IMPETUS_RUNTIME_CONSISTENCY_OBSERVABILITY', true)
};
