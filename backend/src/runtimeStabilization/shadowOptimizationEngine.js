'use strict';

const phaseO = require('./config/phaseOFeatureFlags');

function analyzeShadowOptimization(signals = {}) {
  const shadowLayers = signals.shadow_layers ?? 4;
  const duplicateShadow = signals.shadow_duplication ?? shadowLayers > 3;
  const shadow_pressure = Number(Math.min(1, shadowLayers * 0.18).toFixed(4));
  return {
    shadow_layers: shadowLayers,
    shadow_duplication: duplicateShadow,
    shadow_pressure,
    shadow_cost_estimate: shadow_pressure,
    optimization_recommended: duplicateShadow,
    enforcement_active: phaseO.isShadowOptimizationEnabled(),
    shadow_only: !phaseO.isShadowOptimizationEnabled()
  };
}

module.exports = { analyzeShadowOptimization };
