'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isOperationalRuntimeTuningEnabled: () => _flag('IMPETUS_OPERATIONAL_RUNTIME_TUNING', false),
  isRuntimeTuningAdvisorEnabled: () => _flag('IMPETUS_RUNTIME_TUNING_ADVISOR', false),
  isRuntimeTuningObservabilityEnabled: () => _flag('IMPETUS_RUNTIME_TUNING_OBSERVABILITY', true)
};
