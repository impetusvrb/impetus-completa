'use strict';

const { logPhaseZ22 } = require('../../phaseZ22Logger');

function emitRenderPromotionTelemetry(event, fields = {}) {
  logPhaseZ22(event, fields);
  return { event, ts: new Date().toISOString(), ...fields };
}

module.exports = { emitRenderPromotionTelemetry };
