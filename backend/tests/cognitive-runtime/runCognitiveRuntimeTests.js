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
  process.env.IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY = 'on';
  process.env.IMPETUS_COGNITIVE_COMPOSITION_SHADOW = 'on';
  process.env.IMPETUS_COGNITIVE_RUNTIME_VALIDATION = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const QUALITY_PAYLOAD = {
  profile_code: 'coordinator_quality',
  functional_area: 'quality',
  functional_axis: 'quality',
  visible_modules: ['dashboard', 'quality_intelligence', 'operational'],
  sidebar_governance_runtime: {
    final_governance_locked: true,
    final_visible_modules: ['dashboard', 'quality_intelligence', 'operational'],
    governance_applied: true
  },
  governance_freeze_state: {
    governance_locked: true,
    legacy_pipeline_disabled: true,
    reinjection_blocked: true
  },
  profile_config: {
    cards: [
      { id: 'open_nc', title: 'Não conformidades abertas' },
      { id: 'operational_insights', title: 'Insights operacionais' },
      { id: 'department_interactions', title: 'Interações do departamento' }
    ],
    widgets: [{ id: 'ai_insights' }, { id: 'recent_interactions' }]
  },
  kpis: [
    { label: 'Não conformidades' },
    { label: 'Insights prioritários' }
  ]
};

function testRegistryIntegrity() {
  console.log('\n=== Registry integrity ===');
  resetCache();
  const v = loadFresh('../../src/cognitiveRuntime/validation/cognitiveBlockValidator');
  const r = v.validateRegistryIntegrity();
  assert(r.valid === true, 'registry valid');
  assert(r.total_blocks >= 18, 'minimum block count');
  const reg = loadFresh('../../src/cognitiveRuntime/registry/cognitiveBlockRegistry');
  const nc = reg.getBlockById('quality.nc_center');
  assert(nc?.domain === 'quality', 'quality.nc_center domain');
  assert(nc?.metadata?.hardcoded_dashboard === false, 'no hardcoded dashboard');
}

function testBlockSchemas() {
  console.log('\n=== Block schemas ===');
  resetCache();
  const reg = loadFresh('../../src/cognitiveRuntime/registry/cognitiveBlockRegistry');
  const bad = reg.getBlockById('quality.nc_center');
  const { validateBlockSchema } = loadFresh('../../src/cognitiveRuntime/registry/cognitiveBlockSchemas');
  assert(validateBlockSchema(bad).valid === true, 'valid block schema');
}

function testShadowComposition() {
  console.log('\n=== Shadow composition ===');
  resetCache();
  const shadow = loadFresh('../../src/cognitiveRuntime/composition/compositionShadowResolver');
  const plan = shadow.resolveShadowCompositionPlan(
    { company_id: 't1' },
    QUALITY_PAYLOAD,
    { hierarchy_tier: 'coordination' }
  );
  assert(plan.shadow_skipped !== true, 'shadow plan runs');
  assert(plan.delivery_mutation === false, 'no delivery mutation');
  assert(Array.isArray(plan.recommended_block_ids), 'recommended ids');
  assert(plan.recommended_block_ids.includes('quality.nc_center'), 'nc_center recommended');
  assert(!plan.recommended_block_ids.includes('executive.boardroom'), 'no boardroom for quality coord');
}

async function testSemanticObservability() {
  console.log('\n=== Semantic observability ===');
  resetCache();
  const facade = loadFresh('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const out = await facade.applyCognitiveFoundationToDashboard({ company_id: 't1' }, QUALITY_PAYLOAD, {});
  const rep = out.cognitive_runtime_report;
  assert(rep.observability_skipped !== true, 'observability on');
  assert(rep.semantic_delivery?.is_semantically_generic === true, 'detects generic delivery');
  assert(rep.semantic_delivery?.semantic_score?.average_score > 0, 'semantic score computed');
  assert(out.payload === QUALITY_PAYLOAD, 'payload unchanged');
}

function testSemanticIsolation() {
  console.log('\n=== Semantic isolation ===');
  resetCache();
  const shadow = loadFresh('../../src/cognitiveRuntime/composition/compositionShadowResolver');
  const iso = loadFresh('../../src/cognitiveRuntime/validation/semanticIsolationValidator');
  const plan = shadow.resolveShadowCompositionPlan({}, QUALITY_PAYLOAD, {});
  const r = iso.validateSemanticIsolation(plan, {
    domain_axis: 'quality',
    hierarchy_tier: 'coordination'
  });
  assert(r.semantic_isolation_valid === true, 'quality plan isolated');
}

function testFacadeStatus() {
  console.log('\n=== Facade status ===');
  resetCache();
  const facade = loadFresh('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const st = facade.getCognitiveRuntimeStatus();
  assert(st.phase === 'Z.19' && st.foundation_phase === 'Z.18', 'phase Z.19 with Z.18 foundation');
  assert(st.auto_compose_cockpit === false, 'auto compose off');
  assert(st.replace_dashboard === false, 'replace dashboard off');
}

function testRuntimeCompositionValidator() {
  console.log('\n=== Runtime composition validator ===');
  resetCache();
  const shadow = loadFresh('../../src/cognitiveRuntime/composition/compositionShadowResolver');
  const val = loadFresh('../../src/cognitiveRuntime/validation/runtimeCompositionValidator');
  const plan = shadow.resolveShadowCompositionPlan({}, QUALITY_PAYLOAD, {});
  const r = val.validateRuntimeComposition(plan, {
    domain_axis: 'quality',
    hierarchy_tier: 'coordination'
  });
  assert(r.valid === true, 'full validation pass');
  assert(r.delivery_mutation === false, 'validator confirms no mutation');
}

async function run() {
  testRegistryIntegrity();
  testBlockSchemas();
  testShadowComposition();
  await testSemanticObservability();
  testSemanticIsolation();
  testFacadeStatus();
  testRuntimeCompositionValidator();
  console.log(`\n=== Z.18 Cognitive Runtime: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
