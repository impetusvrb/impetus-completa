'use strict';

const flags = require('./config/phaseZ8FeatureFlags');

function logPhaseZ8(event, payload = {}) {
  if (!flags.isSummaryConvergenceObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, phase: 'Z.8', ts: new Date().toISOString(), ...payload }));
}

module.exports = { logPhaseZ8 };
