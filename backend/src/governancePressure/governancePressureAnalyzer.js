'use strict';

function analyzeGovernancePressure(stabilityPack = {}, ctx = {}) {
  const channel = stabilityPack.pressure?.channel_pressure ?? 0;
  const fatigue = stabilityPack.fatigue?.fatigue_score ?? 0;
  const obs = ctx.observability_layers ?? 4;
  const pressure = Math.min(1, channel * 0.35 + fatigue * 0.35 + obs * 0.03);

  return {
    pressure_score: pressure,
    saturated: pressure > 0.65,
    excess_governance: channel > 0.5 && stabilityPack.pressure?.overload
  };
}

module.exports = { analyzeGovernancePressure };
