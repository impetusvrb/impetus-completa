'use strict';

const flags = require('./config/runtimeConsolidationFeatureFlags');

function logRuntimeConsolidation(event, payload = {}) {
  if (!flags.isRuntimeConsolidationObservabilityEnabled()) return;
  console.log(JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

module.exports = { logRuntimeConsolidation };
