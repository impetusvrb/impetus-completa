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
  process.env.IMPETUS_HR_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_HR_COGNITIVE_RUNTIME = 'shadow';
  process.env.IMPETUS_HR_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_HR_DENSITY_GOVERNOR = 'on';
  process.env.IMPETUS_HR_OBSERVABILITY = 'on';
  process.env.IMPETUS_COGNITIVE_COMPOSITION_ENGINE = 'on';
  process.env.IMPETUS_COGNITIVE_RUNTIME = 'on';
  process.env.IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const MOCK_SIGNALS = {
  ok: true,
  operational: {
    absence_index: 6,
    delay_index: 4,
    presence_compliance: 88,
    fatigue_risk: 22,
    pulse_evaluations: 12,
    hr_alerts_open: 3,
    active_headcount: 45,
    turnover_risk_proxy: 28,
    training_overdue_proxy: 2,
    open_positions_proxy: 1,
    retention_risk_score: 35
  },
  raw: { sector_breakdown: [{ sector: 'producao', count: 4 }] }
};

const SHADOW_BLOCKS = [
  'hr.people_analytics',
  'hr.turnover_heatmap',
  'hr.absenteeism_monitor',
  'hr.retention_risk',
  'hr.workforce_health',
  'hr.training_governance',
  'hr.contextual_hr_ai',
  'hr.hr_narrative'
].map((id) => ({
  block_id: id,
  label: id,
  semantic_layer: 'operational',
  enriched: true,
  shadow_signals: { bridge_status: 'bound_z26' }
}));

const PILOT = {
  pilot_skipped: false,
  shadow_cognitive_cockpit: { blocks: SHADOW_BLOCKS, block_count: SHADOW_BLOCKS.length },
  engine_bridge: { binding_ratio: 0.88 }
};

const PAYLOAD = {
  profile_code: 'coordinator_hr',
  functional_area: 'hr',
  functional_axis: 'hr',
  cognitive_render_promotion: { promotion_applied: true, render_active: true },
  widgets_promoted: [
    { id: 'kpi_cards', render_promoted: true },
    { id: 'grafico_tendencia', render_promoted: true },
    { id: 'alertas', render_promoted: true }
  ]
};

async function testRegistry() {
  console.log('\n=== HR block registry ===');
  resetCache();
  const reg = require('../../src/cognitiveRuntime/registry/cognitiveBlockRegistry');
  assert(reg.getBlockById('hr.people_analytics')?.domain === 'hr', 'people analytics domain');
  assert(reg.getBlockById('rh.turnover_heatmap')?.id === 'hr.turnover_heatmap', 'rh alias');
}

async function testSemanticIsolation() {
  console.log('\n=== HR semantic isolation ===');
  resetCache();
  const v = require('../../src/cognitiveRuntime/domains/hr/runtime/hrSemanticValidator');
  assert(v.validateHrSemanticPayload(PAYLOAD, [{ summary: 'turnover e absenteísmo' }]).ok, 'hr ok');
  assert(v.validateHrSemanticPayload({ summary: 'uptime OEE producao' }, []).ok === false, 'blocks industrial');
}

async function testConsolidation() {
  console.log('\n=== HR consolidation ===');
  resetCache();
  const cons = require('../../src/cognitiveRuntime/domains/hr/cockpit/hrCockpitConsolidator');
  const r = await cons.consolidateHrCockpit({ company_id: '00000000-0000-4000-a000-000000000301' }, PAYLOAD, { mock_signals: MOCK_SIGNALS }, PILOT);
  assert(r.ok, 'consolidation ok');
  assert(r.centers.length >= 4, 'centers');
  assert(r.decision_support?.questions?.length >= 6, 'contextual AI');
  const exposed = JSON.stringify({ centers: r.centers, widgets: r.widgets });
  assert(!/uptime|oee|ebitda|apr/i.test(exposed), 'no leakage');
}

async function testApplicator() {
  console.log('\n=== HR applicator ===');
  resetCache();
  const app = require('../../src/cognitiveRuntime/domains/hr/runtime/hrCockpitConsolidationRuntime');
  const out = await app.applyHrCockpitConsolidation(
    { company_id: '00000000-0000-4000-a000-000000000301' },
    PAYLOAD,
    { force_hr_consolidation: true },
    PILOT
  );
  assert(out.ok && out.hr_cognitive_runtime?.cockpit_mode === 'hr_native', 'hr_native');
}

async function testKpiAdapter() {
  console.log('\n=== HR KPI adapter ===');
  resetCache();
  const kpi = require('../../src/cognitiveRuntime/domains/hr/kpi/hrNativeKpiAdapter');
  const rows = await kpi.buildHrNativeKpis(
    { company_id: '00000000-0000-4000-a000-000000000301' },
    { mock_signals: MOCK_SIGNALS }
  );
  assert(rows.some((k) => /turnover|absente|reten|pulse/i.test(k.title)), 'people kpis');
  assert(!rows.some((k) => /ebitda|oee|uptime/i.test(k.title)), 'no executive/industrial kpi');
}

async function main() {
  console.log('Z.26 HR Native Cockpit Tests');
  testRegistry();
  testSemanticIsolation();
  await testConsolidation();
  await testApplicator();
  await testKpiAdapter();
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
