'use strict';

const c5 = require('../../config/phaseC5FeatureFlags');

function emitC5(event, meta = {}) {
  if (!c5.isC5ObservabilityEnabled()) return;
  console.info(`[COGNITIVE_C5] ${event}`, JSON.stringify({ ts: new Date().toISOString(), ...meta }));
}

module.exports = { emitC5 };
