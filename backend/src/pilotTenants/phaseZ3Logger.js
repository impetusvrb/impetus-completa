'use strict';

const flags = require('./config/phaseZ3FeatureFlags');

function logPhaseZ3(event, payload = {}) {
  if (!flags.isPilotRuntimeObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, phase: 'Z.3', ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseZ3 };
