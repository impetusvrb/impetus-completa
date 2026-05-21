'use strict';

const flags = require('./config/phaseZ6FeatureFlags');

function logPhaseZ6(event, payload = {}) {
  if (!flags.isKpiRuntimeStabilityObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, phase: 'Z.6', ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseZ6 };
