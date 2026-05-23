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
  process.env.IMPETUS_COGNITIVE_RENDER_PROMOTION = 'controlled';
  process.env.IMPETUS_QUALITY_RENDER_PROMOTION = 'pilot';
  process.env.IMPETUS_SPECIALIZED_DELIVERY_ENRICH = 'enrich';
  process.env.IMPETUS_RENDER_PROMOTION_OBSERVABILITY = 'on';
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
  semantic_layer: 'operational',
  enriched: true,
  shadow_signals: { bridge_status: 'bound_z20', metrics: { open_nc: 5 } }
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
  profile_config: {
    widgets: [
      { id: 'resumo_executivo', label: 'Resumo' },
      { id: 'operacoes', label: 'Ops' },
      { id: 'kpi_cards', label: 'KPI' }
    ]
  }
};

function testWidgetResolver() {
  console.log('\n=== Quality widget promotion resolver ===');
  resetCache();
  const mod = loadFresh('../../src/cognitiveRuntime/renderPromotion/quality/qualityWidgetPromotionResolver');
  const widgets = mod.resolvePromotedWidgetsFromShadow({ blocks: SHADOW_BLOCKS });
  assert(widgets.length >= 4, 'min promoted widgets');
  assert(widgets.every((w) => w.render_active === true), 'render_active true');
  assert(widgets.some((w) => w.id === 'qualidade'), 'qualidade promoted');
  assert(widgets.some((w) => w.cognitive_block_id === 'quality.spc_monitor'), 'spc block mapped');
}

function testSuppression() {
  console.log('\n=== Generic widget suppression ===');
  resetCache();
  const sup = loadFresh('../../src/cognitiveRuntime/renderPromotion/quality/qualityWidgetSuppression');
  const plan = sup.buildSuppressionPlan(PAYLOAD.profile_config.widgets);
  assert(plan.generic_suppressed_count >= 1, 'generic suppressed');
  assert(plan.suppressed_generic_ids.includes('resumo_executivo'), 'resumo suppressed');
}

function testSupervisor() {
  console.log('\n=== Render promotion supervisor ===');
  resetCache();
  const sup = loadFresh('../../src/cognitiveRuntime/renderPromotion/runtime/renderPromotionSupervisor');
  const ok = sup.evaluateRenderPromotionEligibility({}, PAYLOAD, { z21_enriched: true }, PILOT);
  assert(ok.allowed === true, 'allowed for coordinator_quality');
  assert(ok.promote_render === true, 'controlled mode');
  const deny = sup.evaluateRenderPromotionEligibility({}, { profile_code: 'cfo' }, {}, PILOT);
  assert(deny.allowed === false, 'deny non-pilot');
}

function testControlledRuntime() {
  console.log('\n=== Controlled render promotion runtime ===');
  resetCache();
  const rt = loadFresh('../../src/cognitiveRuntime/renderPromotion/runtime/controlledRenderPromotionRuntime');
  const out = rt.applyControlledRenderPromotion({ company_id: 't1' }, PAYLOAD, { z21_enriched: true }, PILOT);
  assert(out.ok === true, 'promotion ok');
  assert(out.cognitive_render_promotion?.promotion_applied === true, 'applied flag');
  assert(out.cognitive_render_promotion?.render_active === true, 'render active');
  assert((out.payload.widgets_promoted || []).length >= 4, 'widgets_promoted');
  assert(out.payload.profile_config?.widgets?.length >= 4, 'profile_config widgets updated');
  assert(
    !out.payload.widgets_promoted.some((w) => w.id === 'resumo_executivo'),
    'generic resumo not in promoted list'
  );
}

async function testFacadeStack() {
  console.log('\n=== Facade Z.22 stack ===');
  resetCache();
  process.env.IMPETUS_QUALITY_COCKPIT_PILOT = 'shadow';
  process.env.IMPETUS_COGNITIVE_COCKPIT_QUALITY = 'shadow';
  process.env.IMPETUS_SHADOW_ENRICHMENT = 'on';
  process.env.IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY = 'on';
  const facade = loadFresh('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const out = await facade.applyCognitiveFoundationToDashboard(
    { company_id: 't1' },
    PAYLOAD,
    { force_render_promotion: true, force_specialized_enrich: true }
  );
  const crp =
    out.cognitive_runtime_report?.cognitive_render_promotion ||
    out.payload.cognitive_render_promotion;
  assert(
    crp?.promotion_applied === true || out.cognitive_runtime_report?.cognitive_render_promotion_preview,
    'facade render promotion or preview'
  );
  assert((out.payload.widgets_promoted || []).length >= 1, 'facade widgets_promoted');
}

async function run() {
  testWidgetResolver();
  testSuppression();
  testSupervisor();
  testControlledRuntime();
  await testFacadeStack();
  console.log(`\n=== Z.22 Render Promotion: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
