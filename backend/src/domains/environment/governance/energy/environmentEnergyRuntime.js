'use strict';

const obs = require('../shared/environmentGovernanceObservability');
const flags = require('../environmentGovernanceRuntimeFlags');

function environmentEnergyEfficiencyRuntime(input = {}) {
  const consumed = Number(input.energy_kwh) || 0;
  const expected = Number(input.expected_kwh) || consumed || 1;
  const efficiency = Math.min(100, Math.round((expected / Math.max(consumed, 1)) * 100));
  return { energy_kwh: consumed, expected_kwh: expected, efficiency_pct: efficiency };
}

function environmentEnergyLossRuntime(input = {}) {
  const losses = Number(input.losses_kwh) || 0;
  return { losses_kwh: losses, loss_rate: input.energy_kwh ? losses / input.energy_kwh : 0 };
}

function environmentEnergyCorrelationRuntime(input = {}) {
  return {
    production_units: input.production_units ?? null,
    intensity_kwh_per_unit:
      input.production_units && input.energy_kwh ? input.energy_kwh / input.production_units : null,
    assistive_only: true
  };
}

function environmentEnergyExplainabilityRuntime(eff, corr) {
  return {
    assistive_only: true,
    narrative_hint:
      eff.efficiency_pct < 85 ? 'investigar perdas e correlação produção×energia' : 'eficiência dentro do esperado',
    intensity: corr.intensity_kwh_per_unit
  };
}

function environmentEnergyRuntime(input = {}) {
  if (!flags.isEnvironmentGovernanceRuntimeEnabled()) return { skipped: true };
  return obs.withTiming(
    'environment_energy_runtime_ms',
    () => {
      const efficiency = environmentEnergyEfficiencyRuntime(input);
      const losses = environmentEnergyLossRuntime(input);
      const correlation = environmentEnergyCorrelationRuntime(input);
      return {
        ok: true,
        efficiency,
        losses,
        correlation,
        explainability: environmentEnergyExplainabilityRuntime(efficiency, correlation),
        assistive_only: true
      };
    },
    { module: 'energy' }
  );
}

module.exports = {
  environmentEnergyRuntime,
  environmentEnergyEfficiencyRuntime,
  environmentEnergyCorrelationRuntime,
  environmentEnergyLossRuntime,
  environmentEnergyExplainabilityRuntime
};
