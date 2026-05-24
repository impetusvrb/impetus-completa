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
  process.env.IMPETUS_C4_PRODUCTION_AUTHORITATIVE = 'controlled';
  process.env.IMPETUS_C4_FRONTEND_CONVERGENCE = 'on';
  process.env.IMPETUS_C4_DELIVERY_CERTIFICATION = 'on';
  process.env.IMPETUS_C4_OPERATIONAL_TRUTH = 'on';
  process.env.IMPETUS_C4_EXECUTIVE_ALIGNMENT = 'on';
  process.env.IMPETUS_PRODUCTION_NATIVE_COCKPIT = 'pilot';
  process.env.IMPETUS_PRODUCTION_COGNITIVE_RUNTIME = 'controlled';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const PAYLOAD = {
  profile_code: 'coordinator_production',
  cognitive_render_promotion: { promotion_applied: true, render_active: true },
  widgets_promoted: [{ id: 'kpi_cards' }, { id: 'trend' }, { id: 'alertas' }],
  widgets_legacy: [{ id: 'legacy1' }],
  production_cognitive_runtime: { consolidation_applied: true, cockpit_mode: 'production_native' },
  production_contextual_questions: [{ q: 'Gargalo?', a: 'Fila' }],
  production_bottleneck_runtime: {
    primary_bottleneck: { node_type: 'queue', weight: 0.72 },
    confidence_level: 0.7
  },
  production_operational_graph_runtime: {
    graph: { node_count: 14, nodes: [{ node_type: 'throughput', operational_weight: 0.55 }, { node_type: 'waste', operational_weight: 0.4 }] },
    causal: { strongest_chain: { chain_id: 'setup_queue_throughput', causal_strength: 0.7 }, chains: [{}] }
  },
  operational_economic_runtime: { estimated_loss: 1200, heuristic_model: true, preventive: { avoided_loss_estimate: 200 } },
  maintenance_cognitive_runtime: { reliability: { downtime_minutes: 60 } },
  quality_operational_metrics: { open_nc: 1 },
  executive_cognitive_runtime: { consolidation_applied: true, global_replace: false },
  operational_context_runtime: { timeline_event_count: 8 },
  real_confidence_runtime: { validation: { confidence_integrity: 'valid' }, unified_confidence_score: 0.7 },
  cognitive_utility_runtime: { cognitive_utility_score: 0.72 }
};

function testProductionAuthoritative() {
  console.log('\n=== Production authoritative ===');
  resetCache();
  const { evaluateProductionControlledAuthority } = require('../../src/cognitiveRuntime/c4/productionControlledAuthorityRuntime');
  const a = evaluateProductionControlledAuthority(PAYLOAD, { escalation_safe: true, certification_safe: true });
  assert(a.domain === 'production', 'domain');
  assert(a.authority_mode === 'AUTHORITATIVE_CONTROLLED', 'authoritative controlled');
  assert(a.rollback_ready === true, 'rollback ready');
  assert(a.auto_decisions === false, 'no auto decisions');
}

function testEscalation() {
  console.log('\n=== Authority escalation ===');
  resetCache();
  const { evaluateProductionControlledAuthority } = require('../../src/cognitiveRuntime/c4/productionControlledAuthorityRuntime');
  const { evaluateProductionAuthorityEscalation } = require('../../src/cognitiveRuntime/c4/productionAuthorityEscalationEngine');
  const a = evaluateProductionControlledAuthority(PAYLOAD, {});
  const { analyzeProductionFrontendConvergence } = require('../../src/cognitiveRuntime/c4/frontend/productionFrontendConvergenceRuntime');
  const f = analyzeProductionFrontendConvergence(PAYLOAD, a);
  const e = evaluateProductionAuthorityEscalation(PAYLOAD, a, f);
  assert(e.authoritative_channels.length > 0, 'authoritative channels');
  assert(e.auto_mutation === false, 'no mutation');
}

function testFrontendConvergence() {
  console.log('\n=== Frontend convergence C4 ===');
  resetCache();
  const { analyzeProductionFrontendConvergence } = require('../../src/cognitiveRuntime/c4/frontend/productionFrontendConvergenceRuntime');
  const { buildProductionRuntimeDeliveryMap } = require('../../src/cognitiveRuntime/c4/frontend/productionRuntimeDeliveryMap');
  const a = { authority_mode: 'AUTHORITATIVE_CONTROLLED' };
  const f = analyzeProductionFrontendConvergence(PAYLOAD, a);
  const m = buildProductionRuntimeDeliveryMap(PAYLOAD, a);
  assert(f.frontend_convergence_score >= 0, 'score');
  assert(m.delivery_map.length > 0, 'delivery map');
}

function testDeliveryCertification() {
  console.log('\n=== Delivery certification ===');
  resetCache();
  const { certifyRuntimeDelivery } = require('../../src/cognitiveRuntime/c4/certification/runtimeDeliveryCertificationEngine');
  const { certifyFallbackLeakage } = require('../../src/cognitiveRuntime/c4/certification/fallbackLeakageCertification');
  const c = certifyRuntimeDelivery(PAYLOAD, { authority_mode: 'AUTHORITATIVE_CONTROLLED', runtime_authority_score: 0.7 }, { convergence_safe: true, authoritative_widgets_visible: true }, { authoritative_ratio: 0.6, fallback_ratio: 0.2, delivery_map: [] }, { escalation_safe: true, authority_conflicts: 0 });
  assert(c.runtime_certification_score >= 0, 'cert score');
  const l = certifyFallbackLeakage(PAYLOAD, { hidden_legacy_ratio: 0.1, delivery_map: [], fallback_ratio: 0.2 }, {}, { authority_conflicts: 0 });
  assert(l.leakage_severity != null, 'leakage severity');
}

function testOperationalTruth() {
  console.log('\n=== Operational truth ===');
  resetCache();
  const { validateOperationalTruth } = require('../../src/cognitiveRuntime/c4/truth/operationalTruthValidationEngine');
  const { validateEconomicReality } = require('../../src/cognitiveRuntime/c4/truth/economicRealityValidator');
  const t = validateOperationalTruth(PAYLOAD, PAYLOAD.production_operational_graph_runtime, PAYLOAD.production_bottleneck_runtime, PAYLOAD.production_operational_graph_runtime.causal);
  assert(t.operational_truth_score >= 0, 'truth score');
  const e = validateEconomicReality(PAYLOAD, t, PAYLOAD.production_bottleneck_runtime);
  assert(e.economic_accuracy_score >= 0, 'economic accuracy');
}

function testExecutiveAlignment() {
  console.log('\n=== Executive alignment ===');
  resetCache();
  const { computeExecutiveOperationalAlignment } = require('../../src/cognitiveRuntime/c4/executive/executiveOperationalAlignmentRuntime');
  const { validateExecutiveNarrativeIntegrity } = require('../../src/cognitiveRuntime/c4/executive/executiveNarrativeIntegrityValidator');
  const t = { operational_truth_score: 0.7, validated_causalities: [{}], verified_operational_impact: true };
  const a = computeExecutiveOperationalAlignment(PAYLOAD, t, { operational_economic_truth: true });
  const n = validateExecutiveNarrativeIntegrity(PAYLOAD, a, t);
  assert(a.executive_alignment_score >= 0, 'alignment');
  assert(n.executive_narrative_integrity >= 0, 'narrative integrity');
}

function testFacade() {
  console.log('\n=== C4 facade ===');
  resetCache();
  const { applyCognitiveC4ProductionAuthority } = require('../../src/cognitiveRuntime/c4/cognitiveC4Facade');
  const out = applyCognitiveC4ProductionAuthority({ company_id: 'c4_test' }, PAYLOAD, { force_cognitive_c4: true });
  assert(out.cognitive_c4_summary?.phase === 'C4', 'phase');
  assert(out.production_authority_runtime?.domain === 'production', 'authority runtime');
  assert(out.cognitive_c4_summary?.auto_remediation === false, 'no auto remediation');
  assert(out.cognitive_c4_summary?.authoritative_global === false, 'no global authoritative');
}

async function run() {
  console.log('C4 Production Authoritative Controlled Tests');
  testProductionAuthoritative();
  testEscalation();
  testFrontendConvergence();
  testDeliveryCertification();
  testOperationalTruth();
  testExecutiveAlignment();
  testFacade();
  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
