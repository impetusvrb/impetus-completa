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
  process.env.IMPETUS_C5_RUNTIME_INTEGRITY = 'on';
  process.env.IMPETUS_C5_PRESSURE_MANAGEMENT = 'on';
  process.env.IMPETUS_C5_RUNTIME_STABILITY = 'on';
  process.env.IMPETUS_C5_MULTI_TENANT_ISOLATION = 'on';
  process.env.IMPETUS_C5_DRIFT_DETECTION = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const PAYLOAD = {
  company_id: 'c5_tenant_a',
  cognitive_render_promotion: { promotion_applied: true },
  widgets_promoted: [{ id: 'kpi_cards' }, { id: 'trend' }],
  widgets_legacy: [{ id: 'legacy' }],
  production_cognitive_runtime: { consolidation_applied: true, cockpit_mode: 'production_native' },
  production_authority_runtime: {
    authority_mode: 'AUTHORITATIVE_CONTROLLED',
    runtime_authority_score: 0.85,
    fallback_usage_ratio: 0.2,
    rollback_ready: true
  },
  production_frontend_convergence: { convergence_safe: true, frontend_convergence_score: 0.85, frontend_authority_alignment: 0.88 },
  production_delivery_certification: { certification_safe: true, leakage: { fallback_leakage_detected: false } },
  cognitive_c4_summary: { authority_mode: 'AUTHORITATIVE_CONTROLLED', escalation_safe: true, certification_safe: true },
  production_operational_graph_runtime: { causal: { chains: [{ chain_id: 'a', confidence_score: 0.8, causal_chain: ['maintenance', 'downtime'] }] } },
  operational_truth_runtime: { operational_truth_score: 0.75, false_operational_correlations: [] },
  operational_memory_runtime: { causal_density: 0.8, memory_quality_score: 0.7 },
  real_confidence_runtime: { unified_confidence_score: 0.72, validation: { inflated_confidence_detected: false } },
  cognitive_trust_runtime: { cognitive_trust_index: 0.68 },
  cognitive_utility_runtime: { cognitive_utility_score: 0.7 },
  economic_truth_runtime: { heuristic_drift: 'stable' },
  executive_alignment_runtime: { executive_runtime_integrity: true, narrative: { narrative_risk_level: 'low' }, narrative_dependency_ratio: 0.2 },
  cognitive_authority_runtime: { fragmentation_detected: false, frontend_runtime_alignment: 0.8 },
  inference_validation_runtime: { false_positive_count: 0, inferences: [], weak_count: 1 }
};

function testIntegrity() {
  console.log('\n=== Runtime integrity ===');
  resetCache();
  const { evaluateRuntimeIntegrity } = require('../../src/cognitiveRuntime/integrity/runtimeIntegrityEngine');
  const r = evaluateRuntimeIntegrity(PAYLOAD);
  assert(r.runtime_integrity_score >= 0, 'integrity score');
  assert(Array.isArray(r.integrity_alerts), 'alerts');
  assert(r.auto_mutation === false, 'no mutation');
}

function testPressure() {
  console.log('\n=== Cognitive pressure ===');
  resetCache();
  const { measureCognitivePressure } = require('../../src/cognitiveRuntime/pressure/cognitivePressureEngine');
  const { analyzeInferentialFatigue } = require('../../src/cognitiveRuntime/pressure/inferentialFatigueAnalyzer');
  const p = measureCognitivePressure(PAYLOAD);
  const f = analyzeInferentialFatigue(PAYLOAD);
  assert(p.cognitive_pressure_index >= 0, 'pressure index');
  assert(f.fatigue_safe != null, 'fatigue');
}

function testStability() {
  console.log('\n=== Runtime stability ===');
  resetCache();
  const { certifyRuntimeStability } = require('../../src/cognitiveRuntime/stability/runtimeStabilityCertificationEngine');
  const { detectRuntimeRegression } = require('../../src/cognitiveRuntime/stability/runtimeRegressionDetector');
  const s = certifyRuntimeStability(PAYLOAD, { integrity_safe: true, causal_consistency: 0.8 }, { pressure_safe: true });
  const r = detectRuntimeRegression({ company_id: 'c5_stab' }, PAYLOAD, { runtime_integrity_score: 0.8 });
  assert(s.runtime_stability_score >= 0, 'stability score');
  assert(r.auto_rollback_executed === false, 'no auto rollback');
}

function testIsolation() {
  console.log('\n=== Tenant isolation ===');
  resetCache();
  const { evaluateTenantCognitiveIsolation } = require('../../src/cognitiveRuntime/isolation/tenantCognitiveIsolationRuntime');
  const { validateTenantContextBoundary } = require('../../src/cognitiveRuntime/isolation/tenantContextBoundaryValidator');
  const i = evaluateTenantCognitiveIsolation({ company_id: 'c5_tenant_a' }, PAYLOAD, { tenant_id: 'c5_tenant_a' });
  const b = validateTenantContextBoundary({ company_id: 'c5_tenant_a' }, PAYLOAD);
  assert(i.isolation_safe === true, 'isolation safe');
  assert(b.tenant_context_safe === true, 'boundary safe');
}

function testDrift() {
  console.log('\n=== Runtime drift ===');
  resetCache();
  const { detectRuntimeDrift } = require('../../src/cognitiveRuntime/drift/runtimeDriftDetectionEngine');
  const { adviseDriftRollback } = require('../../src/cognitiveRuntime/drift/driftRollbackAdvisor');
  const d = detectRuntimeDrift({ company_id: 'c5_drift' }, PAYLOAD);
  const a = adviseDriftRollback(d, { regression_detected: false }, { integrity_safe: true });
  assert(a.auto_rollback_executed === false, 'no auto rollback');
  assert(a.supervised_only === true, 'supervised');
}

function testFacade() {
  console.log('\n=== C5 facade ===');
  resetCache();
  const { applyCognitiveC5Stability } = require('../../src/cognitiveRuntime/c5/cognitiveC5Facade');
  const out = applyCognitiveC5Stability({ company_id: 'c5_facade' }, PAYLOAD, { force_cognitive_c5: true });
  assert(out.cognitive_c5_summary?.phase === 'C5', 'phase');
  assert(out.runtime_integrity_runtime != null, 'integrity runtime');
  assert(out.cognitive_c5_summary?.auto_remediation === false, 'no auto remediation');
}

async function run() {
  console.log('C5 Runtime Integrity & Stability Tests');
  testIntegrity();
  testPressure();
  testStability();
  testIsolation();
  testDrift();
  testFacade();
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
