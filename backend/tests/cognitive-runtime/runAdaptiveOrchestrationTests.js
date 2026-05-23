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
  process.env.IMPETUS_ADAPTIVE_ORCHESTRATION = 'shadow';
  process.env.IMPETUS_COGNITIVE_FATIGUE_ANALYSIS = 'on';
  process.env.IMPETUS_ADAPTIVE_DENSITY_RUNTIME = 'on';
  process.env.IMPETUS_USEFULNESS_ORCHESTRATION = 'on';
  process.env.IMPETUS_ORCHESTRATION_OBSERVABILITY = 'on';
  process.env.IMPETUS_COGNITIVE_RUNTIME = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/cognitiveRuntime/')) delete require.cache[k];
  }
}

const MOCK_PAYLOAD = {
  profile_code: 'ceo',
  functional_area: 'executive',
  widgets_promoted: Array.from({ length: 10 }, (_, i) => ({ id: `w${i}`, render_promoted: true })),
  executive_cognitive_runtime: { consolidation_applied: true, cockpit_mode: 'executive_boardroom', executive_cognitive_health: { score: 0.82 } },
  executive_cognitive_centers: [
    { render_slot: 'alertas' },
    { render_slot: 'alertas' },
    { render_slot: 'alertas' },
    { render_slot: 'alertas' }
  ],
  production_cognitive_runtime: { consolidation_applied: true, production_cognitive_health: { score: 0.78 } }
};

async function testNoAutoMutation() {
  console.log('\n=== No auto-mutation ===');
  resetEnv();
  const { applyAdaptiveOrchestration } = require('../../src/cognitiveRuntime/adaptive/adaptiveOrchestrationFacade');
  const out = applyAdaptiveOrchestration({}, MOCK_PAYLOAD, { force_adaptive_orchestration: true });
  assert(out.adaptive_orchestration.auto_mutation_applied === false, 'auto_mutation_applied false');
  assert(out.adaptive_orchestration.auto_remediation !== true, 'no auto_remediation');
}

async function testFatigue() {
  console.log('\n=== Cognitive fatigue ===');
  resetEnv();
  const { analyzeCognitiveFatigue } = require('../../src/cognitiveRuntime/adaptive/fatigue/cognitiveFatigueAnalyzer');
  const f = analyzeCognitiveFatigue(MOCK_PAYLOAD);
  assert(f.fatigue_detected === true, 'fatigue detected on overload mock');
}

async function testUsefulness() {
  console.log('\n=== Usefulness ===');
  resetEnv();
  const { scoreAdaptiveUsefulness } = require('../../src/cognitiveRuntime/adaptive/usefulness/adaptiveUsefulnessScorer');
  const u = scoreAdaptiveUsefulness(MOCK_PAYLOAD);
  assert(u.usefulness_score > 0, 'usefulness score');
}

async function testDensity() {
  console.log('\n=== Adaptive density ===');
  resetEnv();
  const { suggestAdaptiveDensity } = require('../../src/cognitiveRuntime/adaptive/density/adaptiveDensityGovernor');
  const d = suggestAdaptiveDensity(MOCK_PAYLOAD, { fatigue_detected: true }, 'executive');
  assert(d.density_adjustment_suggested.length > 0, 'density suggestions');
  assert(d.within_limits === false || d.density_adjustment_suggested.length > 0, 'suggestions when overloaded');
}

async function testOrchestrator() {
  console.log('\n=== Adaptive orchestrator ===');
  resetEnv();
  const { runAdaptiveCognitiveOrchestrator } = require('../../src/cognitiveRuntime/adaptive/orchestration/adaptiveCognitiveOrchestrator');
  const r = runAdaptiveCognitiveOrchestrator({}, MOCK_PAYLOAD, {});
  assert(r.adaptive_orchestration.runtime_safe === true, 'runtime_safe');
  assert(r.adaptive_orchestration.supervised === true, 'supervised');
  assert(r.recommendations.recommendation_count >= 0, 'recommendations');
}

async function testDeterminism() {
  console.log('\n=== Determinism ===');
  resetEnv();
  const { protectRuntimeStability } = require('../../src/cognitiveRuntime/adaptive/performance/runtimeStabilityProtection');
  const a = { usefulness_score: 0.8, fatigue: false };
  assert(protectRuntimeStability(a, { ...a }).deterministic === true, 'stable hash');
}

async function testFacadePipeline() {
  console.log('\n=== Facade pipeline ===');
  resetEnv();
  const facade = require('../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade');
  const cog = await facade.applyCognitiveFoundationToDashboard(
    { company_id: 'z28', id: 'ceo', role: 'diretor', functional_area: 'executive' },
    { profile_code: 'ceo', functional_area: 'executive', functional_axis: 'executive', ...MOCK_PAYLOAD },
    { force_cognitive_observability: true, force_adaptive_orchestration: true, force_executive_consolidation: true, z27_render_promoted: true }
  );
  assert(cog.payload.adaptive_orchestration != null, 'adaptive_orchestration on payload');
  assert(cog.cognitive_runtime_report.adaptive_orchestration != null, 'report adaptive');
}

async function main() {
  console.log('Z.28 Adaptive Cognitive Orchestration Tests');
  await testNoAutoMutation();
  await testFatigue();
  await testUsefulness();
  await testDensity();
  await testOrchestrator();
  await testDeterminism();
  await testFacadePipeline();
  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
