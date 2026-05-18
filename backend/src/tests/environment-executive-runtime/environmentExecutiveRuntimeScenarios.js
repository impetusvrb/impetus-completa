'use strict';

process.env.IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_EXECUTIVE_ESG_COCKPIT_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_EXECUTIVE_SUSTAINABILITY_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_EXECUTIVE_CARBON_ANALYTICS_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_EXECUTIVE_HEATMAPS_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_EXECUTIVE_RISK_MAPS_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_EXECUTIVE_INTELLIGENCE_CENTER_ENABLED = 'true';
process.env.IMPETUS_ENVIRONMENT_EXECUTIVE_PUBLISH_EVENTS_ENABLED = 'false';

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
  console.log('\nENVIRONMENT EXECUTIVE RUNTIME (backend)\n');

  const route = require('../../routes/environmentExecutive');
  ok('route load', typeof route === 'function' || (route && typeof route.use === 'function'));

  const { validateCatalogType } = require('../../eventPipeline/catalog/industrialEventCatalog');
  for (const t of [
    'environment.executive.esg_insight_generated',
    'environment.executive.sustainability_insight_generated',
    'environment.executive.carbon_hotspot_detected',
    'environment.executive.environmental_risk_escalated',
    'environment.executive.maturity_shift_detected',
    'environment.executive.environmental_narrative_generated',
    'environment.executive.cross_domain_insight_generated'
  ]) {
    ok(`catalog ${t}`, validateCatalogType(t, { strict: true }).ok === true);
  }

  const contract = require('../../domains/environment/contracts/environmentDomainContract');
  ok('contract v5 executive', contract.CONTRACT_VERSION === 5 && contract.EXECUTIVE_API_PREFIX === '/api/environment-executive');

  delete require.cache[require.resolve('../../domains/environment/executive/orchestration/environmentExecutiveOrchestrator')];
  const { runExecutiveEnvironmentPack } = require('../../domains/environment/executive/orchestration/environmentExecutiveOrchestrator');
  const companyId = '00000000-0000-4000-8000-000000000001';
  const pack = await runExecutiveEnvironmentPack(companyId, 'user-1', {
    scope1_tco2e: 100,
    scope2_tco2e: 80,
    scope3_tco2e: 40,
    environmental_score: 65
  }, { emit_events: false });
  ok('executive pack', pack.ok === true && pack.esg?.ok === true);
  ok('carbon cockpit', pack.carbon?.ok === true);
  ok('risk map', pack.risk?.ok === true);
  ok('intelligence center', pack.intelligence?.ok === true);

  const validation = require('../../domains/environment/executive/validation/environmentExecutiveRuntimeValidation');
  ok('validation', validation.runFullExecutiveValidation().runtime.ok === true);

  console.log(`\n${p} passed ${f} failed\n`);
  process.exit(f > 0 ? 1 : 0);
})();
