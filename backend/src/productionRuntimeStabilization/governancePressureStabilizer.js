'use strict';

function stabilizeGovernancePressure(pressurePack = {}) {
  const overload = pressurePack.governance_overload_detected || pressurePack.load?.overload;
  return {
    pressure_controlled: !overload,
    governance_overload: overload === true,
    recommendation: overload ? 'hold_scaling_reduce_observability' : 'maintain'
  };
}

module.exports = { stabilizeGovernancePressure };
