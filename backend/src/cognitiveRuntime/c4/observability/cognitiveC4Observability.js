'use strict';

const c4 = require('../../config/phaseC4FeatureFlags');

function emitC4(event, meta = {}) {
  if (!c4.isC4ObservabilityEnabled()) return;
  console.info(`[COGNITIVE_C4] ${event}`, JSON.stringify({ ts: new Date().toISOString(), ...meta }));
}

module.exports = { emitC4 };
