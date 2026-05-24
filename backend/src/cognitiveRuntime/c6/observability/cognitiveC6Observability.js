'use strict';

const c6 = require('../../config/phaseC6FeatureFlags');

function emitC6(event, meta = {}) {
  if (!c6.isC6ObservabilityEnabled()) return;
  console.info(`[COGNITIVE_C6] ${event}`, JSON.stringify({ ts: new Date().toISOString(), ...meta }));
}

module.exports = { emitC6 };
