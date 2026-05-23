'use strict';

const { logPhaseZ25 } = require('../../../phaseZ25Logger');

function emitSafetyCockpitTelemetry(event, fields = {}) {
  logPhaseZ25(event, { layer: 'safety_cockpit', ...fields });
}

module.exports = { emitSafetyCockpitTelemetry };
