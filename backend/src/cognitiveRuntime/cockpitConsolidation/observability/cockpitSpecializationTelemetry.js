'use strict';

const { logPhaseZ23 } = require('../../phaseZ23Logger');

function emitCockpitSpecializationTelemetry(event, fields = {}) {
  logPhaseZ23(event, fields);
  return { event, ...fields };
}

module.exports = { emitCockpitSpecializationTelemetry };
