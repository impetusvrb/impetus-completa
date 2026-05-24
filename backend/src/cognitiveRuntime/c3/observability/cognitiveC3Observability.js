'use strict';

const c3 = require('../../config/phaseC3FeatureFlags');

function emitC3(event, meta = {}) {
  if (!c3.isC3ObservabilityEnabled()) return;
  console.info(`[COGNITIVE_C3] ${event}`, JSON.stringify({ ts: new Date().toISOString(), ...meta }));
}

module.exports = { emitC3 };
