'use strict';

const { logPhaseZ24 } = require('../../phaseZ24Logger');

function emitDomainCompositionTelemetry(event, fields = {}) {
  logPhaseZ24(event, fields);
  return { event, ts: new Date().toISOString(), ...fields };
}

module.exports = { emitDomainCompositionTelemetry };
