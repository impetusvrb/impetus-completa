'use strict';

const { correlatePair, narrative } = require('../shared/correlationHelpers');

function environmentAssetEnvironmentalImpactRuntime(ctx = {}) {
  return correlatePair(ctx.asset_criticality, ctx.esg_asset_score, 'ativos_x_esg', { scale: 10 });
}

function environmentPredictiveMaintenanceEnvironmentalRuntime(ctx = {}) {
  return correlatePair(ctx.predictive_alert_score, ctx.emissions_spike, 'manutencao_preditiva_x_impacto', { scale: 1 });
}

function environmentUtilitiesCorrelationRuntime(ctx = {}) {
  return correlatePair(ctx.utilities_load, ctx.environmental_degradation, 'utilidades_x_degradacao', { scale: 1 });
}

function environmentMaintenanceCorrelationEngine(ctx = {}) {
  const failure = correlatePair(ctx.failure_count, ctx.emissions_proxy, 'falhas_x_emissoes', { scale: 20 });
  const maint_energy = correlatePair(ctx.maintenance_hours, ctx.energy_kwh, 'manutencao_x_energia', { scale: 500 });
  const asset = environmentAssetEnvironmentalImpactRuntime(ctx);
  const predictive = environmentPredictiveMaintenanceEnvironmentalRuntime(ctx);
  const utilities = environmentUtilitiesCorrelationRuntime(ctx);
  const scores = [failure, maint_energy, asset, predictive, utilities].filter((x) => x.ok).map((x) => x.correlation_score);
  const aggregate = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;
  return {
    ok: true,
    domain_pair: 'environment_x_maintenance',
    correlations: { failure_emissions: failure, maintenance_energy: maint_energy, asset_esg: asset, predictive: predictive, utilities },
    aggregate_score: aggregate,
    narratives: [narrative('maintenance_environment', aggregate)],
    assistive_only: true
  };
}

module.exports = {
  environmentMaintenanceCorrelationEngine,
  environmentAssetEnvironmentalImpactRuntime,
  environmentPredictiveMaintenanceEnvironmentalRuntime,
  environmentUtilitiesCorrelationRuntime
};
