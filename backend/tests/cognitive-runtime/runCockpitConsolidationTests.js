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
function loadFresh(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}
function resetCache() {
  process.env.IMPETUS_SPECIALIZED_COCKPIT_RUNTIME = 'quality_native';
  process.env.IMPETUS_QUALITY_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_COGNITIVE_COCKPIT_BALANCER = 'on';
  process.env.IMPETUS_COCKPIT_DENSITY_GOVERNOR = 'on';
  process.env.IMPETUS_SPECIALIZED_DELIVERY_ENRICH = 'enrich';
  process.env.IMPETUS_COGNITIVE_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_QUALITY_RENDER_PROMOTION = 'pilot';
  process.env.IMPETUS_QUALITY_COCKPIT_PILOT = 'shadow';
  process.env.IMPETUS_SHADOW_ENRICHMENT = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const SHADOW_BLOCKS = [
  'quality.nc_center',
  'quality.capa_engine',
  'quality.spc_monitor',
  'quality.nonconformity_heatmap',
  'quality.recurrence_analysis',
  'quality.audit_governance'
].map((id) => ({
  block_id: id,
  label: id,
  semantic_layer: id.includes('audit') ? 'governance' : 'operational',
  enriched: true,
  shadow_signals: { bridge_status: 'bound_z20', metrics: { open_nc: 6 } }
}));

const PILOT = {
  pilot_skipped: false,
  shadow_cognitive_cockpit: { blocks: SHADOW_BLOCKS, block_count: SHADOW_BLOCKS.length },
  engine_bridge: { binding_ratio: 0.85, blocks_bound: 6 }
};

const PAYLOAD = {
  profile_code: 'coordinator_quality',
  functional_area: 'quality',
  specialized_delivery: { promotion_applied: true },
  cognitive_render_promotion: { promotion_applied: true, render_active: true },
  widgets_promoted: [
    { id: 'qualidade', render_promoted: true },
    { id: 'kpi_cards', render_promoted: true },
    { id: 'grafico_tendencia', render_promoted: true },
    { id: 'alertas', render_promoted: true }
  ],
  profile_config: { widgets: [{ id: 'resumo_executivo' }, { id: 'operacoes' }] }
};

function testCenters() {
  console.log('\n=== Quality centers ===');
  resetCache();
  const { buildQualityOperationalCenter } = loadFresh(
    '../../src/cognitiveRuntime/cockpitConsolidation/quality/qualityOperationalCenter'
  );
  const nc = buildQualityOperationalCenter(
    [{ block_id: 'quality.nc_center', metrics: { open_nc: 5 } }],
    { operational: { open_nc: 5 } }
  );
  assert(nc.center_id === 'quality_operational_nc', 'nc center');
  assert(nc.metrics.open_nc === 5, 'open nc metric');
}

function testDensityGovernor() {
  console.log('\n=== Density governor ===');
  resetCache();
  const gov = loadFresh('../../src/cognitiveRuntime/cockpitConsolidation/runtime/cockpitDensityGovernor');
  const out = gov.applyDensityGovernor(
    Array.from({ length: 10 }, (_, i) => ({ center_id: `c${i}`, metrics: { a: 1, b: 2, c: 3 } })),
    Array.from({ length: 12 }, (_, i) => ({ id: `w${i}` })),
    { max_centers: 6, max_widgets: 8 }
  );
  assert(out.centers.length <= 6, 'centers capped');
  assert(out.widgets.length <= 8, 'widgets capped');
}

function testBalancer() {
  console.log('\n=== Domain balancer ===');
  resetCache();
  const bal = loadFresh('../../src/cognitiveRuntime/cockpitConsolidation/runtime/cockpitDomainBalancer');
  const centers = bal.balanceCentersByDomain([
    { layer: 'operational', weight: 0.3 },
    { layer: 'governance', weight: 0.2 }
  ]);
  assert(centers[0].domain_weight === 0.7, 'operational weight 70%');
}

function testHealth() {
  console.log('\n=== Cognitive health ===');
  resetCache();
  const h = loadFresh('../../src/cognitiveRuntime/cockpitConsolidation/observability/cockpitCognitiveHealth');
  const health = h.computeCockpitCognitiveHealth({
    specialized_ratio: 0.75,
    generic_ratio: 0.2,
    operational_focus: 0.7,
    usefulness: 0.8,
    density: { overload_detected: false, center_count: 5 }
  });
  assert(health.specialization >= 0.7, 'specialization');
  assert(health.healthy === true, 'healthy cockpit');
}

const SYNTHETIC_SIGNALS = {
  ok: true,
  operational: { open_nc: 6, total_proposals: 15, sector_breakdown: [{ sector: 'linha_a', count: 3 }] },
  raw: {
    process_values: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    defect_rates: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
    recurrence_records: [],
    supplier_rows: [{ supplier_id: 's1', score: 80 }]
  }
};

async function testConsolidationRuntime() {
  console.log('\n=== Consolidation runtime ===');
  resetCache();
  const rt = loadFresh('../../src/cognitiveRuntime/cockpitConsolidation/runtime/cognitiveCockpitConsolidator');
  const out = await rt.applyCognitiveCockpitConsolidation(
    { company_id: 't1' },
    PAYLOAD,
    { force_cockpit_consolidation: true, mock_signals: SYNTHETIC_SIGNALS },
    PILOT
  );
  assert(out.ok === true, 'consolidation ok');
  assert(out.specialized_cockpit_runtime?.consolidation_applied === true, 'applied');
  assert(out.specialized_cockpit_runtime?.cockpit_mode === 'quality_native', 'quality_native mode');
  assert((out.payload.quality_cognitive_centers || []).length >= 4, 'centers');
  assert(out.payload.specialized_cockpit_runtime?.cognitive_health?.specialization > 0, 'health');
  assert(
    !(out.payload.widgets_promoted || []).some((w) => w.id === 'resumo_executivo'),
    'no generic resumo in promoted'
  );
}

async function testFacade() {
  console.log('\n=== Facade Z.23 ===');
  resetCache();
  process.env.IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY = 'on';
  const facade = loadFresh('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const out = await facade.applyCognitiveFoundationToDashboard(
    { company_id: 't1' },
    PAYLOAD,
    { force_cockpit_consolidation: true, force_render_promotion: true, force_specialized_enrich: true }
  );
  const scr = out.cognitive_runtime_report?.specialized_cockpit_runtime || out.payload.specialized_cockpit_runtime;
  assert(scr?.consolidation_applied === true || out.cognitive_runtime_report?.specialized_cockpit_preview, 'facade z23');
}

async function run() {
  testCenters();
  testDensityGovernor();
  testBalancer();
  testHealth();
  await testConsolidationRuntime();
  await testFacade();
  console.log(`\n=== Z.23 Cockpit Consolidation: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
