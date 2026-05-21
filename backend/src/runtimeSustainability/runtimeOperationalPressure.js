'use strict';

function measureRuntimeOperationalPressure(stabilityPack = {}, sustainabilityPack = {}) {
  const channelPressure = stabilityPack.pressure?.channel_pressure ?? 0;
  const fatigue = stabilityPack.fatigue?.fatigue_score ?? 0;
  const pressure = Math.min(1, channelPressure * 0.5 + fatigue * 0.5);

  return {
    operational_pressure: pressure,
    high_pressure: pressure > 0.55,
    operational_sustainable: sustainabilityPack.governance_sustainable !== false && pressure < 0.7
  };
}

module.exports = { measureRuntimeOperationalPressure };
