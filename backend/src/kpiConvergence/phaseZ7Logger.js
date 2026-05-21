'use strict';

const flags = require('./config/phaseZ7FeatureFlags');

function logPhaseZ7(event, payload = {}) {
  if (!flags.isKpiConvergenceObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, phase: 'Z.7', ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseZ7 };
