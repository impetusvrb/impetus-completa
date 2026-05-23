'use strict';

const { logPhaseZP0 } = require('../../../phaseZP0Logger');

function emitProductionCockpitTelemetry(event, fields = {}) {
  logPhaseZP0(event, { layer: 'production_cockpit', ...fields });
}

module.exports = { emitProductionCockpitTelemetry };
