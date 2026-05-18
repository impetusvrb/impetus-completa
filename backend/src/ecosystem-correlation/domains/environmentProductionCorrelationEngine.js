'use strict';

const { correlatePair, narrative } = require('../shared/correlationHelpers');
const cognitiveEngines = require('../../domains/environment/cognitive/correlation/environmentCorrelationEngines');

function environmentPcpCorrelationRuntime(ctx = {}) {
  return correlatePair(ctx.pcp_load, ctx.energy_demand, 'pcp_x_consumo', { scale: 100 });
}

function environmentEnergyProductionCorrelation(ctx = {}) {
  return correlatePair(ctx.production_units, ctx.energy_kwh, 'producao_x_energia', { scale: 1000 });
}

function environmentOperationalEfficiencyRuntime(ctx = {}) {
  return correlatePair(ctx.oee, ctx.sustainability_index, 'oee_x_sustentabilidade', { scale: 1 });
}

function environmentProductionCorrelationEngine(ctx = {}) {
  const signals = {
    production_rate: ctx.production_rate != null ? [ctx.production_rate] : [],
    emissions_co2: ctx.emissions_co2 != null ? [ctx.emissions_co2] : [],
    water_flow: ctx.water_flow != null ? [ctx.water_flow] : [],
    effluent_ph: ctx.effluent_ph != null ? [ctx.effluent_ph] : []
  };
  const cog = cognitiveEngines.environmentProductionCorrelationEngine(signals);
  const prod_em = correlatePair(ctx.production_rate, ctx.emissions_proxy, 'producao_x_emissoes', { scale: 500 });
  const bottleneck = correlatePair(ctx.bottleneck_index, ctx.environmental_impact, 'gargalos_x_impacto', { scale: 1 });
  const eta = correlatePair(ctx.production_rate, ctx.eta_load, 'producao_x_eta_ete', { scale: 500 });
  const scores = [prod_em, bottleneck, eta, cog].filter((x) => x.ok && x.correlation_score != null).map((x) => x.correlation_score);
  const aggregate = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : cog.correlation_score || 0;
  return {
    ok: true,
    domain_pair: 'environment_x_production',
    pcp: environmentPcpCorrelationRuntime(ctx),
    energy: environmentEnergyProductionCorrelation(ctx),
    efficiency: environmentOperationalEfficiencyRuntime(ctx),
    cognitive: cog,
    correlations: { production_emissions: prod_em, bottleneck_impact: bottleneck, production_eta: eta },
    aggregate_score: aggregate,
    narratives: [narrative('production_environment', aggregate)],
    assistive_only: true
  };
}

module.exports = {
  environmentProductionCorrelationEngine,
  environmentPcpCorrelationRuntime,
  environmentEnergyProductionCorrelation,
  environmentOperationalEfficiencyRuntime
};
