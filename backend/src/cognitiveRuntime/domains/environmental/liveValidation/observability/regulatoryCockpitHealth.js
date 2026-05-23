'use strict';

function buildRegulatoryCockpitHealth(liveValidation = {}) {
  const lv = liveValidation.environmental_live_validation || liveValidation;
  return {
    regulatory_cockpit_health: {
      integrity: lv.regulatory_integrity === true,
      telemetry_safe: lv.telemetry_safe === true,
      stable: lv.environmental_runtime_stable === true
    }
  };
}

module.exports = { buildRegulatoryCockpitHealth };
