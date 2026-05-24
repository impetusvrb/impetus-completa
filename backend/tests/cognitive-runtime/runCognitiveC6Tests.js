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
  process.env.IMPETUS_C6_RUNTIME_SOVEREIGNTY = 'controlled';
  process.env.IMPETUS_C6_ENGINE_V2_RETIREMENT = 'retired_shadow_reference';
  process.env.IMPETUS_C6_FALLBACK_GOVERNANCE = 'on';
  process.env.IMPETUS_C6_FRONTEND_AUTHORITY = 'on';
  process.env.IMPETUS_C6_GOVERNANCE_CONSOLIDATION = 'on';
  process.env.IMPETUS_C6_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const PAYLOAD = {
  company_id: 'c6_tenant',
  cognitive_render_promotion: { promotion_applied: true },
  widgets_promoted: [{ id: 'kpi_cards' }, { id: 'trend' }, { id: 'production_graph' }],
  widgets_legacy: [{ id: 'legacy_kpi' }],
  production_cognitive_runtime: { consolidation_applied: true, cockpit_mode: 'production_native' },
  production_authority_runtime: {
    authority_mode: 'AUTHORITATIVE_CONTROLLED',
    runtime_authority_score: 0.88,
    fallback_usage_ratio: 0.15,
    rollback_ready: true
  },
  production_frontend_convergence: {
    convergence_safe: true,
    frontend_convergence_score: 0.9,
    frontend_authority_alignment: 0.92
  },
  production_delivery_certification: {
    certification_safe: true,
    leakage: { fallback_leakage_detected: false, shadow_masking_detected: false }
  },
  cognitive_c4_summary: { authority_mode: 'AUTHORITATIVE_CONTROLLED', certification_safe: true },
  runtime_integrity_runtime: { integrity_safe: true, runtime_integrity_score: 0.9, authority_consistency: 0.85 },
  cognitive_pressure_runtime: { pressure_safe: true },
  runtime_stability_runtime: { stability_certified: true, runtime_stability_score: 0.82 },
  tenant_isolation_runtime: { isolation_safe: true },
  runtime_drift_runtime: { drift_detected: false },
  cognitive_c5_summary: { integrity_safe: true, stability_certified: true, isolation_safe: true, drift_detected: false },
  production_operational_graph_runtime: { causal: { chains: [] } },
  operational_economic_runtime: { impact_score: 0.7 },
  cognitive_trust_runtime: { cognitive_trust_index: 0.75 },
  real_confidence_runtime: { unified_confidence_score: 0.8 },
  operational_memory_runtime: { memory_quality_score: 0.7 },
  engine_v2: { payload: { layout: { widgets: [{ id: 'v2_old' }] } } },
  cognitive_authority_runtime: { fragmentation_detected: false }
};

function testSovereignty() {
  console.log('\n=== Runtime sovereignty ===');
  resetCache();
  const { establishCognitiveSovereignty } = require('../../src/cognitiveRuntime/sovereignty/cognitiveSovereigntyRuntime');
  const r = establishCognitiveSovereignty(PAYLOAD);
  assert(r.sovereign_runtime === 'runtime_z', 'sovereign runtime_z');
  assert(r.sovereign_mode === 'controlled_primary_authority', 'controlled primary');
  assert(r.fallback_runtime === 'motor_a', 'fallback motor_a');
  assert(r.authoritative_global !== true, 'no global authoritative');
  assert(r.motor_a_removed === false, 'motor a kept');
}

function testUnification() {
  console.log('\n=== Authority unification ===');
  resetCache();
  const { unifyRuntimeAuthority } = require('../../src/cognitiveRuntime/sovereignty/runtimeAuthorityUnifier');
  const u = unifyRuntimeAuthority(PAYLOAD);
  assert(u.unified_runtime_authority.delivery != null, 'delivery channel');
  assert(u.authority_integrity >= 0, 'integrity score');
  assert(u.auto_mutation === false, 'no mutation');
}

function testV2Retirement() {
  console.log('\n=== Engine V2 retirement ===');
  resetCache();
  const { retireEngineV2 } = require('../../src/cognitiveRuntime/retirement/engineV2RetirementRuntime');
  const v = retireEngineV2(PAYLOAD);
  assert(v.engine_v2_runtime_mode === 'retired_shadow_reference', 'retired shadow');
  assert(v.v2_physically_removed === false, 'v2 not removed');
  assert(v.rollback_available === true, 'rollback');
}

function testFallback() {
  console.log('\n=== Motor A fallback governance ===');
  resetCache();
  const { governMotorAFallback } = require('../../src/cognitiveRuntime/fallback/motorAFallbackGovernanceRuntime');
  const { enforceFallbackVisibility } = require('../../src/cognitiveRuntime/fallback/fallbackVisibilityEnforcer');
  const m = governMotorAFallback(PAYLOAD);
  const v = enforceFallbackVisibility(PAYLOAD, m);
  assert(m.motor_a_mode === 'supervised_fallback', 'supervised fallback');
  assert(m.motor_a_removed === false, 'motor a present');
  assert(v.enforcement_executed === false, 'advisory only');
}

function testFrontend() {
  console.log('\n=== Frontend authority ===');
  resetCache();
  const { enforceFrontendAuthority } = require('../../src/cognitiveRuntime/frontendAuthority/frontendAuthorityEnforcementRuntime');
  const { buildRuntimeDeliveryAuthorityMap } = require('../../src/cognitiveRuntime/frontendAuthority/runtimeDeliveryAuthorityMap');
  const s = { sovereignty_safe: true };
  const f = enforceFrontendAuthority(PAYLOAD, s);
  const map = buildRuntimeDeliveryAuthorityMap(PAYLOAD);
  assert(f.frontend_obeys_runtime_z === true, 'obeys runtime z');
  assert(map.authoritative_widgets.length >= 2, 'authoritative widgets');
  assert(map.runtime_z_dominance_ratio > 0, 'dominance ratio');
}

function testGovernance() {
  console.log('\n=== Governance consolidation ===');
  resetCache();
  const { consolidateCognitiveGovernance } = require('../../src/cognitiveRuntime/governance/cognitiveGovernanceConsolidationRuntime');
  const { certifyRuntimeSovereignty } = require('../../src/cognitiveRuntime/governance/runtimeSovereigntyCertification');
  const g = consolidateCognitiveGovernance(PAYLOAD);
  const c = certifyRuntimeSovereignty(
    { sovereign_runtime: 'runtime_z', sovereignty_safe: true, authoritative_global: false },
    { authority_integrity: 0.85, runtime_competition_detected: false },
    { engine_v2_runtime_mode: 'retired_shadow_reference', retirement_safe: true },
    { motor_a_mode: 'supervised_fallback', dominant_delivery_detected: false },
    { frontend_enforcement_safe: true, frontend_obeys_runtime_z: true },
    g
  );
  assert(g.governance_state.phase === 'C6', 'governance phase');
  assert(c.auto_mutation === false, 'no auto mutation');
}

function testFacade() {
  console.log('\n=== C6 facade ===');
  resetCache();
  const { applyCognitiveC6AuthorityUnification } = require('../../src/cognitiveRuntime/c6/cognitiveC6Facade');
  const out = applyCognitiveC6AuthorityUnification({ company_id: 'c6_facade' }, PAYLOAD, { force_cognitive_c6: true });
  assert(out.cognitive_c6_summary?.phase === 'C6', 'phase C6');
  assert(out.cognitive_sovereignty_runtime != null, 'sovereignty runtime');
  assert(out.cognitive_c6_summary?.auto_remediation === false, 'no auto remediation');
  assert(out.cognitive_c6_summary?.engine_v2_removed === false, 'v2 not removed');
  assert(out.engine_v2_retirement_runtime?.engine_v2_runtime_mode === 'retired_shadow_reference', 'v2 retired mode');
}

async function run() {
  console.log('C6 Cognitive Authority Unification Tests');
  testSovereignty();
  testUnification();
  testV2Retirement();
  testFallback();
  testFrontend();
  testGovernance();
  testFacade();
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
