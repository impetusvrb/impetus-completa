'use strict';

const { logPhaseP1Environmental } = require('../../../phaseP1EnvironmentalLogger');

function emitEnvironmentalCockpitTelemetry(event, fields = {}) {
  logPhaseP1Environmental(event, { layer: 'environmental_cockpit', ...fields });
}

module.exports = { emitEnvironmentalCockpitTelemetry };
