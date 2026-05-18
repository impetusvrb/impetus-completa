'use strict';

const obs = require('../shared/environmentGovernanceObservability');
const flags = require('../environmentGovernanceRuntimeFlags');

function environmentGhgInventoryRuntime(input = {}) {
  const s1 = Number(input.scope1_tco2e) || 0;
  const s2 = Number(input.scope2_tco2e) || 0;
  const s3 = Number(input.scope3_tco2e) || 0;
  return {
    scope1_tco2e: s1,
    scope2_tco2e: s2,
    scope3_tco2e: s3,
    total_tco2e: s1 + s2 + s3,
    baseline_year: input.baseline_year || null
  };
}

function environmentCarbonIntensityRuntime(inventory, input = {}) {
  const production = Number(input.production_units) || 1;
  const intensity = inventory.total_tco2e / production;
  obs.record('environment_carbon_intensity_score', Math.round(intensity * 100) / 100, {});
  return { intensity_per_unit: intensity, production_units: production };
}

function environmentCarbonCorrelationRuntime(inventory, input = {}) {
  return {
    energy_kwh: input.energy_kwh ?? null,
    correlation_energy: inventory.total_tco2e > 0 && input.energy_kwh ? 'positive' : 'unknown',
    assistive_only: true
  };
}

function environmentCarbonExplainabilityRuntime(inventory, intensity) {
  return {
    assistive_only: true,
    no_authority: true,
    scopes: ['scope1', 'scope2', 'scope3'],
    dominant_scope:
      inventory.scope1_tco2e >= inventory.scope2_tco2e && inventory.scope1_tco2e >= inventory.scope3_tco2e
        ? 'scope1'
        : inventory.scope2_tco2e >= inventory.scope3_tco2e
          ? 'scope2'
          : 'scope3',
    intensity: intensity.intensity_per_unit
  };
}

function environmentCarbonRuntime(input = {}) {
  if (!flags.isEnvironmentGovernanceRuntimeEnabled()) return { skipped: true };
  return obs.withTiming(
    'environment_carbon_runtime_ms',
    () => {
      const inventory = environmentGhgInventoryRuntime(input);
      const intensity = environmentCarbonIntensityRuntime(inventory, input);
      return {
        ok: true,
        inventory,
        intensity,
        correlation: environmentCarbonCorrelationRuntime(inventory, input),
        explainability: environmentCarbonExplainabilityRuntime(inventory, intensity),
        assistive_only: true
      };
    },
    { module: 'carbon' }
  );
}

module.exports = {
  environmentCarbonRuntime,
  environmentGhgInventoryRuntime,
  environmentCarbonIntensityRuntime,
  environmentCarbonCorrelationRuntime,
  environmentCarbonExplainabilityRuntime
};
