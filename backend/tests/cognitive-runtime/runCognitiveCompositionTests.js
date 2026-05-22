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
  process.env.IMPETUS_QUALITY_COCKPIT_PILOT = 'shadow';
  process.env.IMPETUS_COGNITIVE_COCKPIT_QUALITY = 'shadow';
  process.env.IMPETUS_COGNITIVE_COMPOSITION_OBSERVABILITY = 'on';
  process.env.IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const QUALITY_PAYLOAD = {
  profile_code: 'coordinator_quality',
  functional_area: 'quality',
  functional_axis: 'quality',
  profile_config: {
    cards: [
      { id: 'open_nc', title: 'Não conformidades abertas' },
      { id: 'operational_insights', title: 'Insights operacionais' }
    ],
    widgets: [{ id: 'ai_insights' }]
  },
  kpis: [{ label: 'Não conformidades' }, { label: 'Insights prioritários' }],
  governance_freeze_state: { governance_locked: true }
};

function testQualityPackRegistry() {
  console.log('\n=== Quality pilot pack ===');
  resetCache();
  const pack = loadFresh('../../src/cognitiveRuntime/registry/qualityCognitiveBlockPack');
  assert(pack.QUALITY_PILOT_BLOCK_IDS.length === 10, '10 official blocks');
  const reg = loadFresh('../../src/cognitiveRuntime/registry/cognitiveBlockRegistry');
  const b = reg.getBlockById('quality.supplier_intelligence');
  assert(b?.semantic_category === 'supplier_intelligence', 'supplier_intelligence registered');
  const alias = reg.getBlockById('quality.supplier_quality');
  assert(alias?.id === 'quality.supplier_intelligence', 'alias resolves');
}

async function testCompositionEngine() {
  console.log('\n=== Runtime cockpit composer ===');
  resetCache();
  const composer = loadFresh('../../src/cognitiveRuntime/composition/runtimeCockpitComposer');
  const r = await composer.composeRuntimeCockpit({ company_id: 't1' }, QUALITY_PAYLOAD, {
    hierarchy_tier: 'coordination'
  });
  assert(!r.skipped, 'composition runs');
  assert(r.delivery_mutation === false, 'no delivery mutation');
  assert(r.legacy_cockpit_preserved === true, 'legacy preserved');
  assert(r.shadow_cognitive_cockpit?.block_count >= 6, 'min blocks composed');
  assert(
    r.recommended_block_ids.includes('quality.nc_center'),
    'nc_center in composition'
  );
  assert(
    r.recommended_block_ids.includes('quality.spc_monitor'),
    'spc_monitor in composition'
  );
}

async function testCockpitComparison() {
  console.log('\n=== Generic vs specialized comparison ===');
  resetCache();
  const pilot = loadFresh('../../src/cognitiveRuntime/pilot/qualityCockpitPilot');
  const out = await pilot.runQualityCockpitPilot({ company_id: 't1' }, QUALITY_PAYLOAD, {});
  assert(out.pilot_active === true, 'pilot active');
  const cmp = out.cockpit_comparison;
  assert(cmp?.generic?.item_count >= 2, 'generic snapshot');
  assert((cmp?.specialized?.block_count || 0) >= 6, 'specialized blocks');
  assert(cmp?.legacy_preserved === true, 'legacy preserved in comparison');
  assert(cmp?.render_substitution === false, 'no render substitution');
  assert(
    typeof cmp?.metrics?.delta_vs_generic === 'number',
    'delta score computed'
  );
}

async function testSemanticValidation() {
  console.log('\n=== Semantic composition validator ===');
  resetCache();
  const composer = loadFresh('../../src/cognitiveRuntime/composition/runtimeCockpitComposer');
  const r = await composer.composeRuntimeCockpit({}, QUALITY_PAYLOAD, {});
  assert(r.semantic_validation?.valid === true, 'quality composition valid');
  assert(!r.semantic_validation?.errors?.length, 'no validation errors');
}

async function testFacadeIntegration() {
  console.log('\n=== Facade Z.19 integration ===');
  resetCache();
  const facade = loadFresh('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const out = await facade.applyCognitiveFoundationToDashboard({ company_id: 't1' }, QUALITY_PAYLOAD, {});
  assert(out.cognitive_runtime_report?.quality_cockpit_pilot?.shadow_cognitive_cockpit, 'pilot in report');
  assert(
    out.cognitive_runtime_report.quality_cockpit_pilot.mode === 'shadow_only',
    'shadow only mode'
  );
  assert(out.payload === QUALITY_PAYLOAD, 'payload unchanged');
}

function testOperationalWeighting() {
  console.log('\n=== Operational weight resolver ===');
  resetCache();
  const w = loadFresh('../../src/cognitiveRuntime/composition/operationalWeightResolver');
  const weights = w.resolveOperationalWeights({ hierarchy_tier: 'coordination' });
  assert(weights.operational === 0.7, 'coordination 70% operational');
  assert(weights.management === 0.2, 'coordination 20% management');
}

async function run() {
  testQualityPackRegistry();
  await testCompositionEngine();
  await testCockpitComparison();
  await testSemanticValidation();
  await testFacadeIntegration();
  testOperationalWeighting();
  console.log(`\n=== Z.19 Composition: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
