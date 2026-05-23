'use strict';

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

function resetCache() {
  process.env.IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME = 'shadow';
  process.env.IMPETUS_ENVIRONMENTAL_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_ENVIRONMENTAL_GOVERNANCE = 'on';
  process.env.IMPETUS_ENVIRONMENTAL_OBSERVABILITY = 'on';
  process.env.IMPETUS_COGNITIVE_COMPOSITION_ENGINE = 'on';
  process.env.IMPETUS_COGNITIVE_RUNTIME = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const MOCK_SIGNALS = {
  ok: true,
  telemetry_readiness: 'ready',
  operational: {
    emissions_tco2e: 120,
    waste_tonnes: 8,
    esg_score: 74,
    licenses_total: 3,
    licenses_expiring: 1,
    regulatory_alerts: 1,
    audit_open: 0,
    incidents_open: 0,
    compliance_risk_score: 25,
    sustainability_maturity: 68
  },
  telemetry: { telemetry_integrity: 'ok', sensor_coverage: 0.6 },
  raw: { licenses: [{ id: '1', days_to_expire: 45 }], incidents: 0 }
};

const PAYLOAD = {
  profile_code: 'coordinator_environmental',
  functional_area: 'environmental',
  functional_axis: 'environmental',
  cognitive_render_promotion: { promotion_applied: true },
  widgets_promoted: [{ id: 'kpi_cards', render_promoted: true }, { id: 'alertas', render_promoted: true }]
};

const PILOT = {
  pilot_skipped: false,
  shadow_cognitive_cockpit: {
    blocks: ['environmental.emissions_monitor', 'environmental.esg_governance', 'environmental.license_compliance'].map(
      (id) => ({ block_id: id, semantic_layer: 'operational' })
    )
  },
  engine_bridge: { binding_ratio: 0.8 }
};

async function testRegistry() {
  console.log('\n=== Environmental block registry ===');
  resetCache();
  const reg = require('../../src/cognitiveRuntime/registry/cognitiveBlockRegistry');
  assert(reg.getBlockById('environmental.emissions_monitor')?.domain === 'environmental', 'emissions domain');
  assert(reg.getBlockById('environment.emissions_monitor')?.id === 'environmental.emissions_monitor', 'alias');
  assert(reg.getRegistryStats().environmental_pilot_blocks === 16, '16 blocks');
}

async function testGovernance() {
  console.log('\n=== Regulatory governance ===');
  resetCache();
  const gov = require('../../src/cognitiveRuntime/domains/environmental/governance/environmentalGovernanceRuntime');
  const out = gov.runEnvironmentalGovernanceRuntime(MOCK_SIGNALS);
  assert(out.compliance != null, 'compliance pack');
  assert(out.esg?.contextual === true, 'esg contextual not boardroom');
}

async function testSemanticIsolation() {
  console.log('\n=== Semantic isolation ===');
  resetCache();
  const v = require('../../src/cognitiveRuntime/domains/environmental/runtime/environmentalSemanticValidator');
  assert(v.validateEnvironmentalSemanticPayload(PAYLOAD, [{ summary: 'emissões ESG licenças' }]).ok, 'env ok');
  assert(v.validateEnvironmentalSemanticPayload({ summary: 'OEE turnover ebitda' }, []).ok === false, 'blocks industrial/hr');
}

async function testDensity() {
  console.log('\n=== Density governor ===');
  resetCache();
  const dg = require('../../src/cognitiveRuntime/domains/environmental/runtime/environmentalDensityGovernor');
  const out = dg.applyEnvironmentalDensityGovernor(
    Array.from({ length: 9 }, (_, i) => ({ center_id: `c${i}`, weight: 0.1, render_slot: 'kpi_cards' })),
    Array.from({ length: 10 }, () => ({ id: 'w' }))
  );
  assert(out.centers.length <= 6, 'max centers');
  assert(out.widgets.length <= 8, 'max widgets');
}

async function testConsolidation() {
  console.log('\n=== Consolidation ===');
  resetCache();
  const { consolidateEnvironmentalCockpit } = require('../../src/cognitiveRuntime/domains/environmental/cockpit/environmentalCockpitConsolidator');
  const out = await consolidateEnvironmentalCockpit({}, PAYLOAD, { mock_signals: MOCK_SIGNALS }, PILOT);
  assert(out.cockpit_mode === 'environmental_native', 'environmental_native');
  assert(out.centers.length <= 6, 'density');
  assert(out.semantic_validation?.ok !== false, 'semantic');
}

async function testLivePipeline() {
  console.log('\n=== Live pipeline coordinator_environmental ===');
  resetCache();
  const dashboardProfileResolver = require('../../src/services/dashboardProfileResolver');
  const facade = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const user = {
    company_id: 'p1env_live',
    id: 'coord_env',
    role: 'coordenador',
    functional_area: 'environmental',
    job_title: 'Coordenador Ambiental'
  };
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  let payload = {
    profile_code: config.profile_code,
    profile_config: config.profile_config,
    functional_area: 'environmental',
    functional_axis: 'environmental'
  };
  const cog = await facade.applyCognitiveFoundationToDashboard(user, payload, {
    force_composition: true,
    force_environmental_consolidation: true,
    p1env_render_promoted: true,
    mock_signals: MOCK_SIGNALS
  });
  const rt = cog.payload.environmental_cognitive_runtime;
  assert(rt?.cockpit_mode === 'environmental_native', 'live environmental_native');
  assert((cog.payload.environmental_cognitive_centers || []).length <= 6, 'live density');
  const blob = JSON.stringify(cog.payload);
  assert(!/ebitda|oee|turnover/i.test(blob), 'no leakage');
}

async function main() {
  console.log('P1 Environmental Native Cockpit Tests');
  await testRegistry();
  await testGovernance();
  await testSemanticIsolation();
  await testDensity();
  await testConsolidation();
  await testLivePipeline();
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
