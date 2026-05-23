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

function resetEnv() {
  process.env.IMPETUS_GOVERNANCE_LEARNING = 'shadow';
  process.env.IMPETUS_PATTERN_LEARNING = 'on';
  process.env.IMPETUS_USEFULNESS_LEARNING = 'on';
  process.env.IMPETUS_CONVERGENCE_LEARNING = 'on';
  process.env.IMPETUS_LEARNING_OBSERVABILITY = 'on';
  process.env.IMPETUS_ADAPTIVE_ORCHESTRATION = 'shadow';
  process.env.IMPETUS_COGNITIVE_RUNTIME = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const MOCK_PAYLOAD = {
  profile_code: 'ceo',
  functional_area: 'executive',
  adaptive_orchestration: {
    usefulness_score: 0.55,
    fatigue_detected: true,
    cross_domain_pressure: 0.6,
    runtime_safe: true,
    auto_mutation_applied: false
  },
  executive_cognitive_runtime: {
    consolidation_applied: true,
    strategic: { convergence: 0.58, maturity: 72 },
    executive_cognitive_health: { score: 0.7 }
  },
  executive_cognitive_centers: [{ render_slot: 'alertas' }, { render_slot: 'alertas' }, { render_slot: 'alertas' }, { render_slot: 'alertas' }]
};

async function testNoAutoMutation() {
  console.log('\n=== No auto-mutation / auto-decision ===');
  resetEnv();
  const { applyGovernanceLearning } = require('../../src/cognitiveRuntime/learning/governanceLearningFacade');
  const out = applyGovernanceLearning({ company_id: 'z29_test' }, MOCK_PAYLOAD, { force_governance_learning: true });
  assert(out.governance_learning.auto_mutation_applied === false, 'auto_mutation false');
  assert(out.governance_learning.supervised === true, 'supervised');
}

async function testPersistence() {
  console.log('\n=== Learning persistence ===');
  resetEnv();
  const { runEnterpriseGovernanceLearning } = require('../../src/cognitiveRuntime/learning/learning/enterpriseGovernanceLearning');
  runEnterpriseGovernanceLearning({ company_id: 'z29_test' }, MOCK_PAYLOAD, {});
  const { getOrchestrationLearningMemory } = require('../../src/cognitiveRuntime/learning/memory/orchestrationLearningMemory');
  const store = getOrchestrationLearningMemory('z29_test');
  assert((store.snapshots || []).length >= 1, 'snapshot persisted');
}

async function testFatigueLearning() {
  console.log('\n=== Fatigue learning ===');
  resetEnv();
  const { analyzeFatigueLearning } = require('../../src/cognitiveRuntime/learning/fatigue/fatigueLearningRuntime');
  const store = { snapshots: [{ fatigue_detected: true }, { fatigue_detected: true }] };
  const f = analyzeFatigueLearning(store);
  assert(f.persistent === true, 'persistent fatigue pattern');
}

async function testUsefulnessLearning() {
  console.log('\n=== Usefulness learning ===');
  resetEnv();
  const { analyzeUsefulnessTrends } = require('../../src/cognitiveRuntime/learning/usefulness/usefulnessTrendAnalyzer');
  const t = analyzeUsefulnessTrends({ snapshots: [{ usefulness_score: 0.8 }, { usefulness_score: 0.55 }] });
  assert(t.trend === 'declining', 'declining trend');
}

async function testConvergenceLearning() {
  console.log('\n=== Convergence learning ===');
  resetEnv();
  const { learnConvergence } = require('../../src/cognitiveRuntime/learning/convergence/convergenceLearningRuntime');
  const c = learnConvergence({ snapshots: [{ convergence_index: 0.7 }, { convergence_index: 0.55 }] }, MOCK_PAYLOAD);
  assert(Array.isArray(c.convergence_trends), 'convergence trends');
}

async function testDeterminism() {
  console.log('\n=== Determinism ===');
  resetEnv();
  const { protectLearningRuntime } = require('../../src/cognitiveRuntime/learning/performance/learningRuntimeProtection');
  const a = { learning_active: true, auto_mutation_applied: false };
  assert(protectLearningRuntime(a, { ...a }).deterministic === true, 'deterministic hash');
}

async function testFacadePipeline() {
  console.log('\n=== Facade pipeline ===');
  resetEnv();
  const facade = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const cog = await facade.applyCognitiveFoundationToDashboard(
    { company_id: 'z29_pipe', id: 'ceo', role: 'diretor', functional_area: 'executive' },
    { profile_code: 'ceo', functional_area: 'executive', functional_axis: 'executive', ...MOCK_PAYLOAD },
    { force_cognitive_observability: true, force_governance_learning: true, force_adaptive_orchestration: true, force_executive_consolidation: true, z27_render_promoted: true }
  );
  assert(cog.payload.governance_learning != null, 'governance_learning on payload');
  assert(cog.cognitive_runtime_report.governance_learning != null, 'report learning');
}

async function main() {
  console.log('Z.29 Enterprise Governance Learning Tests');
  await testNoAutoMutation();
  await testPersistence();
  await testFatigueLearning();
  await testUsefulnessLearning();
  await testConvergenceLearning();
  await testDeterminism();
  await testFacadePipeline();
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
