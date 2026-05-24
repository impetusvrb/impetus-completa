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
  process.env.IMPETUS_COGNITIVE_CONVERGENCE = 'on';
  process.env.IMPETUS_C2_QUALITY_CONTROLLED_AUTHORITY = 'on';
  process.env.IMPETUS_C2_OPERATIONAL_CONTEXT = 'on';
  process.env.IMPETUS_C2_INFERENCE_VALIDATION = 'on';
  process.env.IMPETUS_C2_EVENT_DENSITY = 'on';
  process.env.IMPETUS_C2_FALLBACK_REDUCTION = 'on';
  process.env.IMPETUS_QUALITY_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_SPECIALIZED_COCKPIT_RUNTIME = 'pilot';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const QUALITY_PAYLOAD = {
  profile_code: 'coordinator_quality',
  functional_area: 'quality',
  cognitive_render_promotion: { promotion_applied: true, render_active: true },
  widgets_promoted: [{ id: 'kpi_cards' }, { id: 'alertas' }],
  widgets_legacy: [{ id: 'legacy1' }],
  specialized_cockpit_runtime: { consolidation_applied: true, cockpit_mode: 'quality_native', centers: [{}] },
  quality_insights: [{ summary: 'NC aberta lote 42' }],
  quality_contextual_questions: [{ q: 'Qual NC crítica?', a: 'Lote 42 CAPA pendente' }],
  quality_operational_metrics: { open_nc: 2, open_capa: 1 },
  specialized_summary: 'Qualidade: 2 NC abertas · CAPA em curso',
  cognitive_authority_runtime: { dominant_delivery_runtime: 'runtime_z', fallback_dominance_ratio: 0.3 }
};

async function testQualityAuthority() {
  console.log('\n=== Quality controlled authority ===');
  resetCache();
  const { evaluateQualityControlledAuthority } = require('../../src/cognitiveRuntime/convergence/qualityControlledAuthorityService');
  const q = evaluateQualityControlledAuthority(QUALITY_PAYLOAD, { frontend_convergence_score: 0.8 });
  assert(q.domain === 'quality', 'domain quality');
  assert(q.authority_mode === 'AUTHORITATIVE_CONTROLLED' || q.authority_mode === 'CONTROLLED', 'authority mode');
  assert(q.auto_decisions === false, 'no auto decisions');
}

async function testFrontendConvergence() {
  console.log('\n=== Frontend convergence ===');
  resetCache();
  const { analyzeQualityFrontendConvergence } = require('../../src/cognitiveRuntime/convergence/qualityFrontendConvergenceAnalyzer');
  const { evaluateQualityControlledAuthority } = require('../../src/cognitiveRuntime/convergence/qualityControlledAuthorityService');
  const qa = evaluateQualityControlledAuthority(QUALITY_PAYLOAD, {});
  const f = analyzeQualityFrontendConvergence(QUALITY_PAYLOAD, qa);
  assert(f.frontend_convergence_score >= 0, 'convergence score');
  assert(Array.isArray(f.ignored_runtime_widgets), 'ignored widgets list');
}

async function testOperationalContext() {
  console.log('\n=== Operational context engine ===');
  resetCache();
  const { buildOperationalContextRuntime } = require('../../src/cognitiveRuntime/context/operationalContextEngine');
  const { buildCausalCorrelationRuntime } = require('../../src/cognitiveRuntime/context/causalCorrelationEngine');
  const { getOperationalTimeline } = require('../../src/cognitiveRuntime/context/operationalContextEngine');
  const ctx = buildOperationalContextRuntime({ company_id: 'c2_test' }, QUALITY_PAYLOAD, { force_operational_context: true });
  assert(!ctx.skipped, 'context active');
  const events = getOperationalTimeline({ company_id: 'c2_test' });
  const causal = buildCausalCorrelationRuntime(events);
  assert(events.length >= 1, 'events persisted');
  assert(causal.confidence_avg >= 0, 'causal avg');
}

async function testMemoryValidator() {
  console.log('\n=== Operational memory validator ===');
  resetCache();
  const { buildOperationalMemoryRuntime } = require('../../src/cognitiveRuntime/context/operationalMemoryValidator');
  const events = [
    {
      event_id: 'e1',
      domain: 'quality',
      source_runtime: 'runtime_z',
      event_type: 'nc',
      operational_context: 'NC lote 42',
      causal_chain: [{ step: 'detected' }],
      confidence_score: 0.9,
      created_at: new Date().toISOString()
    }
  ];
  const m = buildOperationalMemoryRuntime(events, { confidence_avg: 0.8, correlations: [{ confidence_score: 0.8 }] });
  assert(m.memory_quality_score > 0, 'memory quality');
  assert(m.rejected_memories !== undefined, 'rejected list');
}

async function testInference() {
  console.log('\n=== Inference validation ===');
  resetCache();
  const { validateInferences } = require('../../src/cognitiveRuntime/validation/inferenceTruthEngine');
  const { buildInferenceValidationRuntime } = require('../../src/cognitiveRuntime/validation/inferenceReliabilityMetrics');
  const v = validateInferences({ company_id: 'c2_inf' }, QUALITY_PAYLOAD, {});
  const full = buildInferenceValidationRuntime(v);
  assert(full.inference_truth_score >= 0, 'truth score');
  assert(full.auto_decisions === false, 'no auto decisions');
}

async function testSyntheticDensity() {
  console.log('\n=== Event density ===');
  resetCache();
  const { generateSyntheticOperationalEvents } = require('../../src/cognitiveRuntime/simulation/syntheticOperationalEventGenerator');
  const { buildEventDensityRuntime } = require('../../src/cognitiveRuntime/simulation/operationalDensityAnalyzer');
  const syn = generateSyntheticOperationalEvents({ company_id: 1 }, {}, { count: 8 });
  const d = buildEventDensityRuntime({ events: syn.events }, syn);
  assert(syn.events.length >= 8, 'synthetic events');
  assert(d.operational_event_density > 0, 'density');
}

async function testFallbackReduction() {
  console.log('\n=== Fallback reduction ===');
  resetCache();
  const { analyzeRuntimeFallbackReduction } = require('../../src/cognitiveRuntime/convergence/runtimeFallbackReductionService');
  const r = analyzeRuntimeFallbackReduction(
    QUALITY_PAYLOAD,
    { fallback_dominance_ratio: 0.3 },
    { channels: { widgets: { runtime: 'runtime_z', mode: 'dominates' } } },
    { fallback_dominance_ratio: 0.3, runtime_z_effective_ratio: 0.7 }
  );
  assert(r.motor_a_removed === false, 'motor a kept');
  assert(r.auto_mutation === false, 'no mutation');
}

async function testFacade() {
  console.log('\n=== Cognitive convergence facade ===');
  resetCache();
  const { applyCognitiveConvergence } = require('../../src/cognitiveRuntime/convergence/reporting/cognitiveConvergenceFacade');
  const out = applyCognitiveConvergence({ company_id: 'c2_facade' }, QUALITY_PAYLOAD, { force_cognitive_convergence: true });
  assert(out.cognitive_convergence_runtime?.phase === 'C2', 'phase C2');
  assert(out.quality_authority_runtime != null, 'quality authority');
  assert(out.payload.operational_memory_runtime != null, 'memory runtime');
  assert(out.cognitive_convergence_runtime.auto_remediation === false, 'no auto remediation');
}

async function run() {
  console.log('C2 Cognitive Convergence Tests');
  await testQualityAuthority();
  await testFrontendConvergence();
  await testOperationalContext();
  await testMemoryValidator();
  await testInference();
  await testSyntheticDensity();
  await testFallbackReduction();
  await testFacade();
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
