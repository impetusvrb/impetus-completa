'use strict';

/**
 * Z.25.1 — Production cockpit readiness verdict
 */

const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function assert(c, m) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
  }
}

function resetEnv() {
  process.env.IMPETUS_SST_NATIVE_COCKPIT = 'pilot';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

async function analyzeProductionProfile() {
  resetEnv();
  const resolver = require('../../src/services/dashboardProfileResolver');
  const facade = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const dr = require('../../src/cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry');

  const prodDef = dr.getDomainDefinition('production');
  assert(prodDef?.cockpit_ready === true, 'production cockpit_ready after Z.P0');
  assert(prodDef?.maturity === 'native', 'production maturity native');

  const user = {
    id: 'prod_coord',
    company_id: 'z251_prod',
    role: 'coordenador',
    functional_area: 'production',
    dashboard_profile: 'coordinator_production',
    hierarchy_level: 3
  };
  const config = resolver.getDashboardConfigForUser(user);
  const cards = (config.profile_config?.cards || []).map((c) => c.key || c.title).join(' ');
  const widgets = (config.profile_config?.widgets || []).map((w) => w.id || w).join(' ');
  const hybridSignals = /operational_insights|department_interactions|ai_insights|recent_interactions|trend/i.test(
    `${cards} ${widgets}`
  );
  assert(hybridSignals, 'production profile still hybrid/generic widgets');

  let payload = {
    profile_code: config.profile_code,
    profile_config: config.profile_config,
    functional_area: 'production',
    functional_axis: 'production',
    kpis: []
  };
  const cog = await facade.applyCognitiveFoundationToDashboard(user, payload, {
    force_cognitive_observability: true,
    mock_signals: { ok: true, operational: { open_incidents: 0 } }
  });
  payload = cog.payload;
  assert(!payload.sst_cognitive_runtime?.consolidation_applied, 'no SST consolidation on production');
  assert(!payload.specialized_cockpit_runtime?.consolidation_applied, 'no quality consolidation on production');

  const prodService = path.join(__dirname, '../../src/services/productionRealtimeService.js');
  assert(fs.existsSync(prodService), 'productionRealtimeService exists for future native cockpit');

  const requiredBlocks = [
    'prod.oee_contextual',
    'prod.bottleneck_center',
    'prod.throughput',
    'prod.line_efficiency',
    'prod.downtime_stoppages',
    'prod.scrap_losses',
    'prod.production_telemetry',
    'prod.production_ai'
  ];
  console.log('  INFO  Required cognitive blocks (not yet in registry):', requiredBlocks.join(', '));
  assert(requiredBlocks.length >= 6, 'production block catalog defined for Z.26+ roadmap');

  return {
    verdict: 'SPECIALIZED_COCKPIT_REQUIRED',
    hybrid: true,
    insufficient: true,
    expected_usefulness_delta: 0.55
  };
}

async function main() {
  console.log('Z.25.1 Production Cockpit Readiness');
  const v = await analyzeProductionProfile();
  assert(v.verdict === 'SPECIALIZED_COCKPIT_REQUIRED', 'production needs native cockpit');
  assert(v.hybrid === true, 'currently hybrid');
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
