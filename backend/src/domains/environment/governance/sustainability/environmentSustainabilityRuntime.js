'use strict';

const obs = require('../shared/environmentGovernanceObservability');
const flags = require('../environmentGovernanceRuntimeFlags');

function environmentWaterFootprintRuntime(input = {}) {
  return { m3: Number(input.water_m3) || 0, intensity: input.water_intensity ?? null };
}

function environmentWasteFootprintRuntime(input = {}) {
  return { tonnes: Number(input.waste_tonnes) || 0, hazardous_ratio: input.hazardous_ratio ?? null };
}

function environmentEnvironmentalMaturityRuntime(input = {}) {
  const score = Math.round(
    (Number(input.esg_score) || 55) * 0.4 +
      (Number(input.compliance_score) || 60) * 0.35 +
      (Number(input.operational_score) || 50) * 0.25
  );
  obs.record('environment_environmental_maturity_score', score, {});
  return { maturity_score: score, band: score >= 70 ? 'mature' : score >= 50 ? 'developing' : 'initial' };
}

function environmentSustainabilityNarrativeRuntime(maturity, water, waste) {
  return {
    assistive_only: true,
    headline: `Maturidade ambiental: ${maturity.maturity_score}`,
    water_footprint_m3: water.m3,
    waste_footprint_t: waste.tonnes
  };
}

function environmentSustainabilityRuntime(input = {}) {
  if (!flags.isEnvironmentGovernanceRuntimeEnabled()) return { skipped: true };
  return obs.withTiming(
    'environment_sustainability_runtime_ms',
    () => {
      const water = environmentWaterFootprintRuntime(input);
      const waste = environmentWasteFootprintRuntime(input);
      const maturity = environmentEnvironmentalMaturityRuntime(input);
      const sustainability_score = Math.round((maturity.maturity_score + (100 - Math.min(100, waste.tonnes)) ) / 2);
      obs.record('environment_governance_density_score', 1, {});
      return {
        ok: true,
        sustainability_score,
        water_footprint: water,
        waste_footprint: waste,
        maturity,
        narrative: environmentSustainabilityNarrativeRuntime(maturity, water, waste),
        assistive_only: true
      };
    },
    { module: 'sustainability' }
  );
}

module.exports = {
  environmentSustainabilityRuntime,
  environmentWaterFootprintRuntime,
  environmentWasteFootprintRuntime,
  environmentEnvironmentalMaturityRuntime,
  environmentSustainabilityNarrativeRuntime
};
