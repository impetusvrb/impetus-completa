'use strict';

const { correlatePair, narrative } = require('../shared/correlationHelpers');

function environmentCarbonLogisticsRuntime(ctx = {}) {
  return correlatePair(ctx.fleet_km, ctx.transport_co2, 'frota_x_emissoes', { scale: 10000 });
}

function environmentFleetEmissionRuntime(ctx = {}) {
  return correlatePair(ctx.fuel_liters, ctx.emissions_co2, 'combustivel_x_esg', { scale: 5000 });
}

function environmentReverseLogisticsRuntime(ctx = {}) {
  return correlatePair(ctx.mtr_count, ctx.reverse_logistics_score, 'mtr_x_supply_chain', { scale: 100 });
}

function environmentLogisticsCorrelationEngine(ctx = {}) {
  const carbon = environmentCarbonLogisticsRuntime(ctx);
  const fleet = environmentFleetEmissionRuntime(ctx);
  const reverse = environmentReverseLogisticsRuntime(ctx);
  const waste = correlatePair(ctx.transport_trips, ctx.waste_hauled, 'transporte_x_residuos', { scale: 200 });
  const scores = [carbon, fleet, reverse, waste].filter((x) => x.ok).map((x) => x.correlation_score);
  const aggregate = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;
  return {
    ok: true,
    domain_pair: 'environment_x_logistics',
    correlations: { carbon_logistics: carbon, fleet_emission: fleet, reverse_logistics: reverse, transport_waste: waste },
    aggregate_score: aggregate,
    narratives: [narrative('logistics_carbon', aggregate)],
    assistive_only: true
  };
}

module.exports = {
  environmentLogisticsCorrelationEngine,
  environmentCarbonLogisticsRuntime,
  environmentFleetEmissionRuntime,
  environmentReverseLogisticsRuntime
};
