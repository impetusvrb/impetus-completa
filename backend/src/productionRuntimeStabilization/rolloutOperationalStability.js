'use strict';

function assessRolloutOperationalStability(pack = {}) {
  const oscillation = pack.stability?.oscillation?.oscillating === true;
  const cockpitOk = pack.usefulness?.cockpit_usefulness_preserved !== false;
  return {
    rollout_stable: !oscillation && cockpitOk,
    cockpit_degradation: !cockpitOk,
    oscillation_detected: oscillation
  };
}

module.exports = { assessRolloutOperationalStability };
