'use strict';

function measureGovernanceScalingPressure(z10Pack = {}, ctx = {}) {
  const channelPressure = z10Pack.consolidation?.stability?.pressure?.channel_pressure ?? 0;
  const obsLayers = ctx.observability_layers ?? 6;
  const pressure = Math.min(1, channelPressure * 0.5 + obsLayers * 0.04);
  return {
    scaling_pressure: pressure,
    governance_overload: pressure > 0.55,
    overload: pressure > 0.65
  };
}

module.exports = { measureGovernanceScalingPressure };
