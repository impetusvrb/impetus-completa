'use strict';

const flags = require('./config/phaseZ4FeatureFlags');

function logPhaseZ4(event, payload = {}) {
  if (!flags.isPilotObservabilityEnabled()) return;
  const line = JSON.stringify({
    event,
    phase: 'Z.4',
    ts: new Date().toISOString(),
    ...payload
  });
  console.log(line);
}

module.exports = { logPhaseZ4 };
