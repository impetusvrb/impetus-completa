'use strict';

function buildStrategicRuntimeHealth(liveValidation = {}) {
  const lv = liveValidation.executive_live_validation || liveValidation;
  return {
    strategic_runtime_health: {
      stable: lv.boardroom_stable === true,
      useful: lv.strategic_usefulness >= 0.7,
      isolated: lv.operational_leak_detected !== true
    }
  };
}

module.exports = { buildStrategicRuntimeHealth };
