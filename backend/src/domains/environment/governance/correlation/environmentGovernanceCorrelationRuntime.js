'use strict';

const operational = require('../../analytics/environmentOperationalCorrelationEngine');
const cognitive = require('../../analytics/environmentCognitiveCorrelationEngine');

function environmentQualityGovernanceCorrelation(input = {}) {
  return {
    ok: true,
    domain: 'quality',
    scrap_impact: input.scrap_tonnes ?? null,
    rework_waste_proxy: input.rework_count ?? null,
    assistive_only: true
  };
}

function environmentSafetyGovernanceCorrelation(input = {}) {
  return {
    ok: true,
    domain: 'safety',
    chemical_exposure: input.chemical_events ?? null,
    spill_risk: input.spill_risk ?? null,
    assistive_only: true
  };
}

function environmentLogisticsGovernanceCorrelation(input = {}) {
  return {
    ok: true,
    domain: 'logistics',
    transport_emissions_proxy: input.transport_tco2e ?? null,
    reverse_logistics: input.reverse_logistics ?? null,
    assistive_only: true
  };
}

function environmentOperationalCorrelationRuntime(ctx = {}) {
  return operational.environmentalOperationalCorrelationEngine(ctx);
}

function environmentCognitiveCorrelationRuntime(ctx = {}) {
  return cognitive.environmentalCognitiveCorrelationEngine(ctx);
}

function buildGovernanceCorrelationPack(input = {}) {
  return {
    ok: true,
    quality: environmentQualityGovernanceCorrelation(input.quality || {}),
    safety: environmentSafetyGovernanceCorrelation(input.safety || {}),
    logistics: environmentLogisticsGovernanceCorrelation(input.logistics || {}),
    operational: environmentOperationalCorrelationRuntime(input.operational || {}),
    cognitive: environmentCognitiveCorrelationRuntime(input.cognitive || {}),
    energy: {
      intensity_kwh_per_unit: input.energy?.intensity ?? null,
      assistive_only: true
    }
  };
}

module.exports = {
  environmentQualityGovernanceCorrelation,
  environmentSafetyGovernanceCorrelation,
  environmentLogisticsGovernanceCorrelation,
  environmentOperationalCorrelationRuntime,
  environmentCognitiveCorrelationRuntime,
  buildGovernanceCorrelationPack
};
