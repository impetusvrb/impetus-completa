'use strict';

process.env.IMPETUS_ENVIRONMENT_COGNITIVE_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_PREDICTION_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_CROSS_DOMAIN_CORRELATION_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_CONTEXTUAL_RECOMMENDATIONS_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_EXPLAINABILITY_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_NARRATIVES_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_COGNITIVE_PUBLISH_EVENTS_ENABLED = 'false';

let p = 0;
let f = 0;
function ok(label, cond) {
  if (cond) {
    p++;
    console.log('  OK', label);
  } else {
    f++;
    console.log('  FAIL', label);
  }
}

(async () => {
  console.log('\nENVIRONMENT COGNITIVE RUNTIME (backend)\n');

  const route = require('../../routes/environmentCognitive');
  ok('route load', typeof route === 'function' || (route && typeof route.use === 'function'));

  const { environmentDriftPredictionEngine } = require('../../domains/environment/cognitive/prediction/environmentPredictionEngines');
  const drift = environmentDriftPredictionEngine([10, 10.2, 10.5, 11, 11.5, 12, 12.5, 13]);
  ok('drift prediction', drift.ok === true);

  const { buildCognitiveExplainability } = require('../../domains/environment/cognitive/explainability/environmentCognitiveExplainability');
  const ex = buildCognitiveExplainability({ rationale: 't' });
  ok('explainability assistive', ex.assistive_only === true && ex.no_plc_write === true);

  const { validateCatalogType } = require('../../eventPipeline/catalog/industrialEventCatalog');
  for (const t of [
    'environment.cognitive.risk_predicted',
    'environment.cognitive.drift_detected',
    'environment.cognitive.trend_detected',
    'environment.cognitive.overflow_risk',
    'environment.cognitive.excess_emission_risk',
    'environment.cognitive.recommendation_generated',
    'environment.cognitive.reasoning_generated',
    'environment.cognitive.environmental_narrative_generated',
    'environment.cognitive.cross_domain_correlation_detected'
  ]) {
    const v = validateCatalogType(t, { strict: true });
    ok(`catalog ${t}`, v.ok === true);
  }

  const contract = require('../../domains/environment/contracts/environmentDomainContract');
  ok('contract v4 cognitive', contract.CONTRACT_VERSION === 4 && contract.COGNITIVE_API_PREFIX === '/api/environment-cognitive');

  delete require.cache[require.resolve('../../domains/environment/cognitive/orchestration/environmentCognitiveOrchestrator')];
  const { runCognitiveEnvironmentPack } = require('../../domains/environment/cognitive/orchestration/environmentCognitiveOrchestrator');
  const companyId = '00000000-0000-4000-8000-000000000001';
  const pack = await runCognitiveEnvironmentPack(companyId, 'user-1', {
    water_flow: [120, 122, 125, 130, 135, 142, 148, 155],
    emissions_co2: [40, 42, 45, 50, 55, 62],
    reservoir_level: [70, 75, 80, 85, 90],
    production_rate: [100, 105],
    logistics_carbon_index: 0.6
  }, { emit_events: false });
  ok('orchestrator pack', pack.ok === true && pack.risk?.ok === true);

  const validation = require('../../domains/environment/cognitive/validation/environmentCognitiveRuntimeValidation');
  const vpack = validation.runFullCognitiveValidation();
  ok('validation pack', vpack.runtime.ok === true);

  console.log(`\n${p} passed ${f} failed\n`);
  process.exit(f > 0 ? 1 : 0);
})();
