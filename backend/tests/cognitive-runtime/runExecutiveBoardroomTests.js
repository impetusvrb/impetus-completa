'use strict';

const MOCK_ENTERPRISE = {
  source: 'mock',
  aggregation_readiness: 'ready',
  domains: {
    production: { present: true, health_score: 82, risk_score: 18, stable: true, strategic_oee: 78 },
    quality: { present: true, health_score: 80, risk_score: 15 },
    safety: { present: true, health_score: 85, risk_score: 12 },
    hr: { present: true, health_score: 76, risk_score: 22, stability: 78 },
    environmental: { present: true, health_score: 74, risk_score: 28, esg_score: 72 }
  },
  enterprise: {
    health_index: 79,
    risk_index: 28,
    maturity_index: 76,
    convergence_index: 0.82,
    pressure_index: 32,
    strategic_oee: 78
  }
};

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
  process.env.IMPETUS_EXECUTIVE_BOARDROOM = 'pilot';
  process.env.IMPETUS_EXECUTIVE_COGNITIVE_RUNTIME = 'shadow';
  process.env.IMPETUS_EXECUTIVE_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_EXECUTIVE_DENSITY_GOVERNOR = 'on';
  process.env.IMPETUS_EXECUTIVE_OBSERVABILITY = 'on';
  process.env.IMPETUS_EXECUTIVE_LIVE_VALIDATION = 'shadow';
  process.env.IMPETUS_COGNITIVE_COMPOSITION_ENGINE = 'on';
  process.env.IMPETUS_COGNITIVE_RUNTIME = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

async function testRegistry() {
  console.log('\n=== Executive block registry ===');
  resetEnv();
  const reg = require('../../src/cognitiveRuntime/registry/cognitiveBlockRegistry');
  assert(reg.getBlockById('executive.enterprise_health')?.domain === 'executive', 'enterprise_health domain');
  assert(reg.getRegistryStats().executive_pilot_blocks === 18, '18 executive blocks');
}

async function testGovernance() {
  console.log('\n=== Executive governance ===');
  resetEnv();
  const g = require('../../src/cognitiveRuntime/domains/executive/governance/boardroomLeakageProtection');
  assert(g.protectBoardroomFromLeakage({ summary: 'risco enterprise maturidade' }).cross_domain_clean, 'strategic clean');
  assert(!g.protectBoardroomFromLeakage({ summary: 'APR/PT lote linha_a' }).cross_domain_clean, 'operational leak blocked');
}

async function testDensity() {
  console.log('\n=== Executive density ===');
  resetEnv();
  const d = require('../../src/cognitiveRuntime/domains/executive/density/executiveDensityGovernor');
  const ok = d.applyExecutiveDensityGovernor(
    Array.from({ length: 4 }, (_, i) => ({ center_id: `c${i}`, weight: 0.2 })),
    Array.from({ length: 5 }, (_, i) => ({ id: `w${i}` }))
  );
  assert(ok.density.density_safe === true, 'density safe');
  const { protectBoardroomAttention } = require('../../src/cognitiveRuntime/domains/executive/density/boardroomAttentionProtection');
  assert(
    protectBoardroomAttention([
      { render_slot: 'alertas' },
      { render_slot: 'alertas' },
      { render_slot: 'alertas' },
      { render_slot: 'alertas' }
    ]).alert_fatigue === true,
    'alert fatigue'
  );
}

async function testAggregation() {
  console.log('\n=== Multi-domain aggregation ===');
  resetEnv();
  const { consolidateEnterpriseSignals } = require('../../src/cognitiveRuntime/domains/executive/aggregation/enterpriseSignalConsolidator');
  const ent = consolidateEnterpriseSignals({}, { mock_enterprise_signals: MOCK_ENTERPRISE });
  assert(ent.aggregation_readiness === 'ready', 'aggregation ready');
  assert(ent.enterprise.health_index >= 70, 'health index');
  assert(ent.enterprise.invented_telemetry !== true, 'no invented');
}

async function testFacade() {
  console.log('\n=== Boardroom consolidator ===');
  resetEnv();
  const { consolidateExecutiveBoardroom } = require('../../src/cognitiveRuntime/domains/executive/cockpit/executiveCockpitConsolidator');
  const out = await consolidateExecutiveBoardroom(
    {},
    { profile_code: 'ceo', functional_area: 'executive', widgets_promoted: [{ id: 'kpi_cards', render_promoted: true }] },
    { mock_enterprise_signals: MOCK_ENTERPRISE },
    { shadow_cognitive_cockpit: { blocks: [] } }
  );
  assert(out.cockpit_mode === 'executive_boardroom', 'executive_boardroom mode');
  assert(out.centers.length <= 5, 'max 5 centers');
  assert(out.executive_contextual_ai?.strategic_only === true, 'strategic ai only');
}

async function testLivePipeline() {
  console.log('\n=== Live pipeline CEO ===');
  resetEnv();
  const dashboardProfileResolver = require('../../src/services/dashboardProfileResolver');
  const facade = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const user = {
    company_id: 'z27_live',
    id: 'ceo1',
    role: 'diretor',
    functional_area: 'executive',
    job_title: 'CEO'
  };
  const config = dashboardProfileResolver.getDashboardConfigForUser(user);
  const cog = await facade.applyCognitiveFoundationToDashboard(
    user,
    {
      profile_code: config.profile_code || 'ceo',
      profile_config: config.profile_config,
      functional_area: 'executive',
      functional_axis: 'executive'
    },
    {
      force_composition: true,
      force_executive_consolidation: true,
      z27_render_promoted: true,
      mock_enterprise_signals: MOCK_ENTERPRISE
    }
  );
  const rt = cog.payload.executive_cognitive_runtime;
  assert(rt?.cockpit_mode === 'executive_boardroom', 'live boardroom');
  const blob = JSON.stringify(cog.payload);
  assert(!/apr\/pt|loto|linha_[a-z]/i.test(blob), 'no operational granular leak');
}

async function main() {
  console.log('Z.27 Executive Strategic Boardroom Tests');
  await testRegistry();
  await testGovernance();
  await testDensity();
  await testAggregation();
  await testFacade();
  await testLivePipeline();
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
