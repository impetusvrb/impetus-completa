'use strict';

const flags = require('./config/phaseZ0FeatureFlags');

function logPhaseZ0(event, payload = {}) {
  if (!flags.isRuntimeObservationObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, phase: 'Z.0', ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseZ0 };
