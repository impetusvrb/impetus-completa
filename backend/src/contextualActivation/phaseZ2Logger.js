'use strict';

const flags = require('./config/phaseZ2FeatureFlags');

function logPhaseZ2(event, payload = {}) {
  if (!flags.isContextualActivationObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, phase: 'Z.2', ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseZ2 };
