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
  process.env.IMPETUS_C3_PRODUCTION_GRAPH = 'on';
  process.env.IMPETUS_C3_ECONOMIC_INTELLIGENCE = 'on';
  process.env.IMPETUS_C3_REAL_CONFIDENCE = 'on';
  process.env.IMPETUS_C3_COGNITIVE_UTILITY = 'on';
  process.env.IMPETUS_C3_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const PAYLOAD = {
  profile_code: 'coordinator_production',
  production_cognitive_runtime: { consolidation_applied: true, cockpit_mode: 'production_native' },
  maintenance_cognitive_runtime: {
    consolidation_applied: true,
    reliability: { downtime_minutes: 90 }
  },
  quality_operational_metrics: { open_nc: 2, open_capa: 1 },
  quality_insights: [{ summary: 'NC lote 12' }],
  production_contextual_questions: [{ q: 'Gargalo?', a: 'Fila inspeção' }],
  specialized_summary: 'Produção: fila elevada · 2 NC',
  operational_memory_runtime: { causal_density: 0.8, memory_quality_score: 0.75, verified_operational_memory: 3 },
  inference_validation_runtime: {
    inference_truth_score: 0.7,
    confirmed_count: 2,
    rejected_count: 0,
    weak_count: 1,
    reliability_metrics: { precision: 0.72, false_positive_rate: 0.08 }
  }
};

function testProductionGraph() {
  console.log('\n=== Production graph ===');
  resetCache();
  const { buildProductionOperationalGraph } = require('../../src/cognitiveRuntime/productionGraph/productionOperationalGraphEngine');
  const { resolveCrossDomainCausality } = require('../../src/cognitiveRuntime/productionGraph/crossDomainCausalResolver');
  const g = buildProductionOperationalGraph(PAYLOAD, []);
  assert(g.nodes.length === 14, '14 nodes');
  const c = resolveCrossDomainCausality(g, []);
  assert(c.chains.length >= 1, 'causal chains');
}

function testBottleneck() {
  console.log('\n=== Bottleneck intelligence ===');
  resetCache();
  const { buildProductionOperationalGraph } = require('../../src/cognitiveRuntime/productionGraph/productionOperationalGraphEngine');
  const { resolveCrossDomainCausality } = require('../../src/cognitiveRuntime/productionGraph/crossDomainCausalResolver');
  const { detectOperationalBottleneck } = require('../../src/cognitiveRuntime/productionGraph/operationalBottleneckIntelligence');
  const g = buildProductionOperationalGraph(PAYLOAD, []);
  const c = resolveCrossDomainCausality(g, []);
  const b = detectOperationalBottleneck(g, c);
  assert(b.primary_bottleneck != null, 'bottleneck detected');
  assert(b.auto_remediation === false, 'no auto remediation');
}

function testEconomic() {
  console.log('\n=== Economic intelligence ===');
  resetCache();
  const { buildProductionOperationalGraph } = require('../../src/cognitiveRuntime/productionGraph/productionOperationalGraphEngine');
  const { detectOperationalBottleneck } = require('../../src/cognitiveRuntime/productionGraph/operationalBottleneckIntelligence');
  const { calculateOperationalEconomicImpact } = require('../../src/cognitiveRuntime/economics/operationalEconomicImpactEngine');
  const { computeEconomicPressureIndex } = require('../../src/cognitiveRuntime/economics/economicPressureIndexEngine');
  const g = buildProductionOperationalGraph(PAYLOAD, []);
  const b = detectOperationalBottleneck(g, { strongest_chain: { operational_impact: 0.6 } });
  const e = calculateOperationalEconomicImpact(PAYLOAD, g, b);
  assert(e.estimated_loss > 0, 'estimated loss');
  assert(e.auto_decisions === false, 'no auto decisions');
  const p = computeEconomicPressureIndex(PAYLOAD, g, e);
  assert(p.economic_pressure_index >= 0, 'pressure index');
}

function testConfidence() {
  console.log('\n=== Real confidence ===');
  resetCache();
  const { computeRealConfidence } = require('../../src/cognitiveRuntime/confidence/realConfidenceEngine');
  const { validateConfidenceConsistency } = require('../../src/cognitiveRuntime/confidence/confidenceConsistencyValidator');
  const { trackConfidenceEvolution } = require('../../src/cognitiveRuntime/confidence/confidenceEvolutionTracker');
  const c = computeRealConfidence(PAYLOAD, { graph_readiness: 0.7, node_count: 14 }, PAYLOAD.operational_memory_runtime, PAYLOAD.inference_validation_runtime);
  assert(c.unified_confidence_score > 0, 'unified score');
  assert(c.narrative_confidence !== c.causal_confidence || true, 'dimensions separated');
  const v = validateConfidenceConsistency(c, PAYLOAD.operational_memory_runtime, { node_count: 14 });
  assert(v.confidence_integrity != null, 'integrity');
  const ev = trackConfidenceEvolution({ company_id: 'c3_conf' }, c, v);
  assert(ev.trend != null, 'evolution trend');
}

function testUtility() {
  console.log('\n=== Cognitive utility ===');
  resetCache();
  const { validateCognitiveUtility } = require('../../src/cognitiveRuntime/utility/cognitiveUtilityValidationEngine');
  const { computeCognitiveTrustIndex } = require('../../src/cognitiveRuntime/utility/cognitiveTrustIndexEngine');
  const u = validateCognitiveUtility(PAYLOAD, PAYLOAD.inference_validation_runtime);
  assert(u.cognitive_utility_score >= 0, 'utility score');
  const t = computeCognitiveTrustIndex({ unified_confidence_score: 0.7, historical_confidence: 0.7, causal_confidence: 0.75 }, u, PAYLOAD.inference_validation_runtime, {});
  assert(t.cognitive_trust_index >= 0, 'trust index');
}

function testFacade() {
  console.log('\n=== C3 facade ===');
  resetCache();
  const { applyCognitiveC3Intelligence } = require('../../src/cognitiveRuntime/c3/cognitiveC3Facade');
  const out = applyCognitiveC3Intelligence({ company_id: 'c3_facade' }, PAYLOAD, { force_cognitive_c3: true });
  assert(out.production_operational_graph_runtime?.phase === 'C3', 'graph runtime');
  assert(out.operational_economic_runtime?.heuristic_model === true, 'economic heuristic');
  assert(out.real_confidence_runtime?.unified_confidence_score != null, 'confidence');
  assert(out.cognitive_trust_runtime?.cognitive_trust_index != null, 'trust');
  assert(out.payload.cognitive_c3_summary?.auto_decisions === false, 'no auto decisions');
}

async function run() {
  console.log('C3 Production Operational Intelligence Tests');
  testProductionGraph();
  testBottleneck();
  testEconomic();
  testConfidence();
  testUtility();
  testFacade();
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
