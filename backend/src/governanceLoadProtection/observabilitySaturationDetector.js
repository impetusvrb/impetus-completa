'use strict';

function detectObservabilitySaturation(ctx = {}) {
  const layers = ctx.observability_layers ?? 6;
  const saturated = layers > 9;
  return {
    saturated,
    observability_saturation_detected: saturated,
    layers,
    excess_observability: layers > 12
  };
}

module.exports = { detectObservabilitySaturation };
