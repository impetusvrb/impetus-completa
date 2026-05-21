'use strict';

const flags = require('./config/phaseZ5FeatureFlags');

function logPhaseZ5(event, payload = {}) {
  if (!flags.isKpiPilotObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, phase: 'Z.5', ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseZ5 };
