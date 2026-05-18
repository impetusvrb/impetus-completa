'use strict';

const { buildCognitiveExplainability } = require('../explainability/environmentCognitiveExplainability');
const { clamp01 } = require('../shared/environmentCognitiveStats');
const COG = require('../events/cognitiveEventHints');

function _pairCorrelation(a, b, label) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isFinite(na) || !Number.isFinite(nb)) {
    return { ok: false, label, score: 0 };
  }
  const score = clamp01(Math.abs(na - nb) < 0.2 ? 0.75 : Math.abs(na + nb) / 2);
  return {
    ok: true,
    label,
    correlation_score: score,
    inputs: { a: na, b: nb },
    explainability: buildCognitiveExplainability({
      rationale: `Correlação assistiva ${label}.`,
      evidence: [`a=${na}`, `b=${nb}`],
      confidence: score,
      related_event_hints: [COG.CROSS_DOMAIN_CORRELATION_DETECTED]
    })
  };
}

function environmentProductionCorrelationEngine(signals) {
  return _pairCorrelation(signals.production_rate?.slice(-1)[0], signals.emissions_co2?.slice(-1)[0], 'production_x_emissions');
}

function environmentQualityCorrelationEngine(signals) {
  return _pairCorrelation(signals.quality_waste_correlation, signals.waste_generation?.slice(-1)[0], 'quality_x_waste');
}

function environmentSafetyCorrelationEngine(signals) {
  return _pairCorrelation(signals.safety_chemical_exposure, signals.effluent_ph?.slice(-1)[0], 'safety_x_effluent');
}

function environmentLogisticsCorrelationEngine(signals) {
  return _pairCorrelation(signals.logistics_carbon_index, signals.emissions_co2?.slice(-1)[0], 'logistics_x_carbon');
}

function environmentEnergyCorrelationEngine(signals) {
  return _pairCorrelation(signals.energy_demand?.slice(-1)[0], signals.production_rate?.slice(-1)[0], 'energy_x_production');
}

function environmentOperationalCorrelationRuntime(signals) {
  const eta = signals.water_flow?.length ? signals.water_flow.slice(-1)[0] : null;
  const ete = signals.effluent_ph?.length ? signals.effluent_ph.slice(-1)[0] : null;
  return _pairCorrelation(eta, ete, 'eta_ete_consumption');
}

function environmentCrossDomainCognitiveRuntime(signals) {
  const engines = {
    production: environmentProductionCorrelationEngine(signals),
    quality: environmentQualityCorrelationEngine(signals),
    safety: environmentSafetyCorrelationEngine(signals),
    logistics: environmentLogisticsCorrelationEngine(signals),
    energy: environmentEnergyCorrelationEngine(signals),
    operational: environmentOperationalCorrelationRuntime(signals)
  };
  const scores = Object.values(engines).filter((e) => e.ok).map((e) => e.correlation_score);
  const aggregate = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;
  return {
    ok: true,
    engines,
    cross_domain_correlation_score: aggregate,
    emit_event: aggregate > 0.55,
    explainability: buildCognitiveExplainability({
      rationale: 'Pacote de correlação multi-domínio ambiental.',
      confidence: aggregate,
      contributing_factors: Object.keys(engines)
    })
  };
}

module.exports = {
  environmentProductionCorrelationEngine,
  environmentQualityCorrelationEngine,
  environmentSafetyCorrelationEngine,
  environmentLogisticsCorrelationEngine,
  environmentEnergyCorrelationEngine,
  environmentOperationalCorrelationRuntime,
  environmentCrossDomainCognitiveRuntime
};
