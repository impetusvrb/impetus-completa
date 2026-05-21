'use strict';

function assessPilotOperationalIntegrity(pack = {}) {
  const stable = pack.stabilization?.operational_stable === true;
  const useful = pack.usefulness?.usefulness?.operationally_useful !== false;
  return { integrity_score: stable && useful ? 0.85 : 0.45, operational_reliable: stable && useful };
}

module.exports = { assessPilotOperationalIntegrity };
