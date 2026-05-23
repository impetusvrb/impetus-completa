'use strict';

const { logPhaseZ26 } = require('../../../phaseZ26Logger');

function emitHrCockpitTelemetry(event, fields = {}) {
  logPhaseZ26(event, { layer: 'hr_cockpit', ...fields });
}

module.exports = { emitHrCockpitTelemetry };
