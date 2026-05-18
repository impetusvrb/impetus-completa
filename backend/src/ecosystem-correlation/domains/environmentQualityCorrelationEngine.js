'use strict';

const { correlatePair, narrative } = require('../shared/correlationHelpers');

function environmentQualityWasteCorrelation(ctx = {}) {
  return correlatePair(ctx.scrap_tonnes, ctx.waste_generation, 'residuos_x_qualidade', { scale: 50 });
}

function environmentQualityCarbonCorrelation(ctx = {}) {
  return correlatePair(ctx.rejected_units, ctx.carbon_proxy, 'producao_rejeitada_x_carbono', { scale: 1000 });
}

function environmentQualityImpactRuntime(ctx = {}) {
  const ncr = correlatePair(ctx.ncr_count, ctx.emissions_proxy, 'ncr_x_emissoes', { scale: 20 });
  const capa = correlatePair(ctx.capa_open, ctx.sustainability_score, 'capa_x_sustentabilidade', { scale: 10 });
  const spc = correlatePair(ctx.spc_drift, ctx.energy_consumption, 'spc_x_consumo', { scale: 1 });
  const scores = [ncr, capa, spc].filter((x) => x.ok).map((x) => x.correlation_score);
  const aggregate = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;
  return {
    ok: true,
    domain_pair: 'environment_x_quality',
    correlations: { ncr_emissions: ncr, capa_sustainability: capa, spc_consumption: spc },
    waste: environmentQualityWasteCorrelation(ctx),
    carbon: environmentQualityCarbonCorrelation(ctx),
    aggregate_score: aggregate,
    narratives: [narrative('quality_impact', aggregate)],
    assistive_only: true
  };
}

function environmentQualityCorrelationEngine(ctx = {}) {
  return environmentQualityImpactRuntime(ctx);
}

module.exports = {
  environmentQualityCorrelationEngine,
  environmentQualityImpactRuntime,
  environmentQualityWasteCorrelation,
  environmentQualityCarbonCorrelation
};
