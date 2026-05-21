'use strict';

function measureTenantObservabilityPressure(ctx = {}) {
  const layers = ctx.observability_layers ?? 5;
  const pressure = Math.min(1, layers * 0.08);
  return {
    observability_pressure: pressure,
    excess_observability: layers > 8,
    layers
  };
}

module.exports = { measureTenantObservabilityPressure };
