'use strict';

function measureEnterpriseRuntimePressure(perf = {}, pressure = {}) {
  return {
    saturation: pressure.saturation === true || perf.boardroom_heavy === true,
    enterprise_pressure: pressure.enterprise_pressure ?? 0
  };
}

module.exports = { measureEnterpriseRuntimePressure };
