'use strict';

const flags = require('./config/phaseZ1FeatureFlags');

function logPhaseZ1(event, payload = {}) {
  if (!flags.isContextualEnforcementObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, phase: 'Z.1', ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseZ1 };
