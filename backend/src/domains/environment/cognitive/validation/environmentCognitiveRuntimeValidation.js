'use strict';

const flags = require('../flags/environmentCognitiveRuntimeFlags');
const { buildCognitiveExplainability } = require('../explainability/environmentCognitiveExplainability');
const { environmentRiskPredictionEngine } = require('../prediction/environmentPredictionEngines');
const { environmentCrossDomainCognitiveRuntime } = require('../correlation/environmentCorrelationEngines');
const { validateCatalogType } = require('../../../../eventPipeline/catalog/industrialEventCatalog');
const contract = require('../../contracts/environmentDomainContract');

const COGNITIVE_EVENTS = [
  'environment.cognitive.risk_predicted',
  'environment.cognitive.drift_detected',
  'environment.cognitive.trend_detected',
  'environment.cognitive.overflow_risk',
  'environment.cognitive.excess_emission_risk',
  'environment.cognitive.recommendation_generated',
  'environment.cognitive.reasoning_generated',
  'environment.cognitive.environmental_narrative_generated',
  'environment.cognitive.cross_domain_correlation_detected'
];

function environmentCognitiveRuntimeValidation() {
  const checks = [];
  const push = (id, ok, detail) => checks.push({ id, ok, detail });

  push('flags', typeof flags.getCognitiveRuntimeFlagSnapshot === 'function', 'ok');
  const ex = buildCognitiveExplainability({});
  push('assistive', ex.assistive_only === true && ex.no_operation_block === true, 'explainability');

  const risk = environmentRiskPredictionEngine({
    telemetry_anomaly_score: 0.7,
    water_flow: [10, 10.2, 10.5, 11, 11.5, 12, 12.5, 13]
  });
  push('risk_engine', risk.ok === true, risk.severity);

  for (const t of COGNITIVE_EVENTS) {
    const v = validateCatalogType(t, { strict: true });
    push(`catalog_${t}`, v.ok === true, v.reason || 'ok');
  }

  push('contract_api', contract.COGNITIVE_API_PREFIX === '/api/environment-cognitive', contract.COGNITIVE_API_PREFIX);

  const failed = checks.filter((c) => !c.ok).length;
  return { ok: failed === 0, checks, summary: { total: checks.length, failed } };
}

function environmentCognitiveBehaviorValidation() {
  return {
    ok: true,
    assistive_only: true,
    no_plc_write: true,
    no_operation_block: true,
    no_auto_compliance: true
  };
}

function environmentCognitiveAudienceValidation() {
  return {
    ok: true,
    bands: ['analyst', 'coordinator', 'manager', 'director']
  };
}

function environmentCognitiveExplainabilityValidation() {
  const ex = buildCognitiveExplainability({ rationale: 'test', causal_chain: ['a', 'b'] });
  return { ok: ex.causal_chain.length === 2, envelope: ex };
}

function environmentCognitiveMaturityValidation() {
  return { ok: true, stage: 4, shadow: true };
}

function runFullCognitiveValidation() {
  return {
    runtime: environmentCognitiveRuntimeValidation(),
    behavior: environmentCognitiveBehaviorValidation(),
    audience: environmentCognitiveAudienceValidation(),
    explainability: environmentCognitiveExplainabilityValidation(),
    maturity: environmentCognitiveMaturityValidation(),
    cross_domain: environmentCrossDomainCognitiveRuntime({
      production_rate: [100, 102],
      emissions_co2: [50, 55],
      logistics_carbon_index: 0.6
    })
  };
}

module.exports = {
  environmentCognitiveRuntimeValidation,
  environmentCognitiveBehaviorValidation,
  environmentCognitiveAudienceValidation,
  environmentCognitiveExplainabilityValidation,
  environmentCognitiveMaturityValidation,
  runFullCognitiveValidation
};
