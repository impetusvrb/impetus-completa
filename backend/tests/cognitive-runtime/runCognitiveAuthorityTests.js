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
  process.env.IMPETUS_COGNITIVE_AUTHORITY_AUDIT = 'on';
  process.env.IMPETUS_COGNITIVE_CONSOLIDATION_FREEZE = 'on';
  process.env.IMPETUS_COGNITIVE_AUTHORITY_OBSERVABILITY = 'on';
  process.env.IMPETUS_QUALITY_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_QUALITY_COGNITIVE_RUNTIME = 'shadow';
  process.env.IMPETUS_PRODUCTION_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_PRODUCTION_COGNITIVE_RUNTIME = 'shadow';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const MOCK_PAYLOAD = {
  profile_code: 'coordinator_quality',
  functional_area: 'quality',
  cognitive_render_promotion: { promotion_applied: true, render_active: true },
  widgets_promoted: [{ id: 'kpi_cards', render_promoted: true }],
  widgets_legacy: [{ id: 'legacy_kpi' }],
  kpis: [{ id: 'k1', value: 10 }],
  kpis_specialized: [{ id: 'sk1', value: 12 }],
  specialized_cockpit_runtime: {
    consolidation_applied: true,
    cockpit_mode: 'quality_native'
  },
  engine_v2: { payload: { layout: { widgets: [{ id: 'v2w' }] } } },
  adaptive_orchestration: { adaptation_recommended: true, auto_mutation_applied: false },
  governance_learning: { auto_mutation_applied: false }
};

function testAuthorityResolver() {
  console.log('\n=== cognitiveAuthorityResolver ===');
  resetCache();
  const { resolveCognitiveAuthority } = require('../../src/cognitiveRuntime/consolidation/authority/cognitiveAuthorityResolver');
  const a = resolveCognitiveAuthority(MOCK_PAYLOAD, {});
  assert(a.official_runtime === 'runtime_z', 'official runtime_z');
  assert(a.fallback_runtime === 'motor_a', 'fallback motor_a');
  assert(a.runtime_z_present === true, 'runtime z present');
}

function testDominance() {
  console.log('\n=== runtimeDominanceAnalyzer ===');
  resetCache();
  const { resolveCognitiveAuthority } = require('../../src/cognitiveRuntime/consolidation/authority/cognitiveAuthorityResolver');
  const { analyzeRuntimeDominance } = require('../../src/cognitiveRuntime/consolidation/delivery/runtimeDominanceAnalyzer');
  const a = resolveCognitiveAuthority(MOCK_PAYLOAD, {});
  const d = analyzeRuntimeDominance(MOCK_PAYLOAD, a);
  assert(d.dominant_delivery_runtime != null, 'dominant set');
  assert(d.channels.widgets != null, 'widgets channel');
}

function testCockpitValidator() {
  console.log('\n=== cockpitAuthorityValidator ===');
  resetCache();
  const { validateCockpitAuthority } = require('../../src/cognitiveRuntime/consolidation/governance/cockpitAuthorityValidator');
  const c = validateCockpitAuthority(MOCK_PAYLOAD);
  assert(c.domains.quality != null, 'quality domain');
  assert(c.closest_to_authoritative != null || c.cockpit_authority_ratio >= 0, 'authority metrics');
}

function testFallback() {
  console.log('\n=== fallbackDominanceInspector ===');
  resetCache();
  const { resolveCognitiveAuthority } = require('../../src/cognitiveRuntime/consolidation/authority/cognitiveAuthorityResolver');
  const { analyzeRuntimeDominance } = require('../../src/cognitiveRuntime/consolidation/delivery/runtimeDominanceAnalyzer');
  const { inspectFallbackDominance } = require('../../src/cognitiveRuntime/consolidation/runtime/fallbackDominanceInspector');
  const a = resolveCognitiveAuthority(MOCK_PAYLOAD, {});
  const d = analyzeRuntimeDominance(MOCK_PAYLOAD, a);
  const f = inspectFallbackDominance(MOCK_PAYLOAD, a, d);
  assert(typeof f.fallback_dominance_ratio === 'number', 'ratio numeric');
}

function testFragmentation() {
  console.log('\n=== cognitiveFragmentationAnalyzer ===');
  resetCache();
  const { resolveCognitiveAuthority } = require('../../src/cognitiveRuntime/consolidation/authority/cognitiveAuthorityResolver');
  const { analyzeRuntimeDominance } = require('../../src/cognitiveRuntime/consolidation/delivery/runtimeDominanceAnalyzer');
  const { analyzeCognitiveFragmentation } = require('../../src/cognitiveRuntime/consolidation/runtime/cognitiveFragmentationAnalyzer');
  const a = resolveCognitiveAuthority(MOCK_PAYLOAD, {});
  const d = analyzeRuntimeDominance(MOCK_PAYLOAD, a);
  const f = analyzeCognitiveFragmentation(MOCK_PAYLOAD, a, d);
  assert(f.fragmentation_score >= 0, 'fragmentation score');
}

function testFrontend() {
  console.log('\n=== frontendAuthorityAnalyzer ===');
  resetCache();
  const { analyzeFrontendAuthority } = require('../../src/cognitiveRuntime/consolidation/frontend/frontendAuthorityAnalyzer');
  const f = analyzeFrontendAuthority(MOCK_PAYLOAD, { dominant_delivery_runtime: 'runtime_z' });
  assert(f.predicted_runtime != null, 'predicted runtime');
  assert(f.frontend_runtime_alignment >= 0, 'alignment');
}

function testV2Audit() {
  console.log('\n=== engineV2ComparativeAudit ===');
  resetCache();
  const { resolveCognitiveAuthority } = require('../../src/cognitiveRuntime/consolidation/authority/cognitiveAuthorityResolver');
  const { analyzeRuntimeDominance } = require('../../src/cognitiveRuntime/consolidation/delivery/runtimeDominanceAnalyzer');
  const { runEngineV2ComparativeAudit } = require('../../src/cognitiveRuntime/consolidation/audit/engineV2ComparativeAudit');
  const a = resolveCognitiveAuthority(MOCK_PAYLOAD, {});
  const d = analyzeRuntimeDominance(MOCK_PAYLOAD, a);
  const v = runEngineV2ComparativeAudit(MOCK_PAYLOAD, a, d);
  assert(v.ranking.length === 3, 'three runtimes ranked');
}

function testFacade() {
  console.log('\n=== cognitiveAuthorityConsolidationFacade ===');
  resetCache();
  const { applyCognitiveAuthorityConsolidation } = require('../../src/cognitiveRuntime/consolidation/reporting/cognitiveAuthorityConsolidationFacade');
  const out = applyCognitiveAuthorityConsolidation({ company_id: 1 }, MOCK_PAYLOAD, {});
  const car = out.cognitive_authority_runtime;
  assert(car.official_runtime === 'runtime_z', 'payload official');
  assert(car.engine_v2_status != null, 'v2 status');
  assert(car.auto_remediation === false, 'no auto remediation');
  assert(car.auto_decisions === false, 'no auto decisions');
  assert(typeof car.cognitive_authority_score === 'number', 'authority score');
}

async function run() {
  console.log('C0+C1 Cognitive Authority Consolidation Tests');
  testAuthorityResolver();
  testDominance();
  testCockpitValidator();
  testFallback();
  testFragmentation();
  testFrontend();
  testV2Audit();
  testFacade();
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
