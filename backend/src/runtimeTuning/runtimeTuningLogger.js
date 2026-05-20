'use strict';

const flags = require('./config/runtimeTuningFeatureFlags');

function logRuntimeTuning(event, payload = {}) {
  if (!flags.isRuntimeTuningObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

module.exports = { logRuntimeTuning };
