'use strict';

/**
 * npm run test:enterprise-runtime-stabilization
 */

const path = require('path');
const fs = require('fs');

const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');
let passed = 0;
let failed = 0;

function assert(c, m, d) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
    if (d) console.log('       ', JSON.stringify(d).slice(0, 300));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function resetPhaseO() {
  delete process.env.IMPETUS_RUNTIME_STABILIZATION;
  delete process.env.IMPETUS_GOVERNANCE_FATIGUE_DETECTION;
  delete process.env.IMPETUS_PIPELINE_REDUNDANCY_ANALYSIS;
  delete process.env.IMPETUS_RUNTIME_EFFICIENCY_ENGINE;
  delete process.env.IMPETUS_SHADOW_OPTIMIZATION;
  process.env.IMPETUS_RUNTIME_STABILIZATION_OBSERVABILITY = 'on';
  delete require.cache[require.resolve('../../src/runtimeStabilization/config/phaseOFeatureFlags')];
  loadFresh('../../src/runtimeStabilization/stabilizationTelemetry').resetStabilizationTelemetry();
  loadFresh('../../src/runtimeStabilization/cognitiveOverheadTracker').clearOverheadTracker();
}

function testGovernanceFatigue() {
  console.log('\n=== Governance fatigue ===');
  resetPhaseO();
  const det = loadFresh('../../src/runtimeStabilization/governanceFatigueDetector');
  const r = det.detectGovernanceFatigue({ active_layers: 6, cognitive_operational_pressure: 0.7 });
  assert(r.fatigue_detected === true, 'fatigue detected');
}

function testRedundancyDetection() {
  console.log('\n=== Redundancy detection ===');
  const ana = loadFresh('../../src/runtimeStabilization/pipelineRedundancyAnalyzer');
  const r = ana.analyzePipelineRedundancy({
    semantic_alignment: true,
    precision_delivery: true,
    cognitive_convergence: true,
    enterprise_cognitive_operations: true
  });
  assert(r.redundancy_count > 0, 'redundant pairs found');
  assert(r.auto_remove === false, 'no auto remove');
}

function testRuntimeOverhead() {
  console.log('\n=== Runtime overhead ===');
  const eff = loadFresh('../../src/runtimeStabilization/runtimeEfficiencyEngine');
  const r = eff.computeRuntimeEfficiency({ active_layers: 6, observability_blocks: 5 });
  assert(r.cognitive_overhead > 0.3, 'overhead measured');
  assert(r.runtime_efficiency < 0.8, 'efficiency reduced under load');
}

function testShadowSaturation() {
  console.log('\n=== Shadow saturation ===');
  const det = loadFresh('../../src/runtimeStabilization/shadowRedundancyDetector');
  const r = det.detectShadowRedundancy({
    semantic_alignment: { shadow_only: true },
    precision_delivery: { shadow_only: true },
    cognitive_convergence: { shadow_only: true },
    enterprise_cognitive_operations: { shadow_only: true }
  });
  assert(r.redundant_shadow === true, 'shadow redundant');
}

function testOrchestrationOverlap() {
  console.log('\n=== Orchestration overlap ===');
  const ana = loadFresh('../../src/runtimeStabilization/orchestrationEfficiencyAnalyzer');
  const r = ana.analyzeOrchestrationEfficiency({ pipeline_hops: 8 });
  assert(r.orchestration_efficiency < 0.5, 'low efficiency many hops');
}

function testObservabilityOverload() {
  console.log('\n=== Observability overload ===');
  const det = loadFresh('../../src/runtimeStabilization/observabilitySaturationDetector');
  const r = det.detectObservabilitySaturation({ observability_blocks: 5 });
  assert(r.observability_saturation === true, 'saturation detected');
}

function testRuntimeEfficiency() {
  console.log('\n=== Runtime efficiency ===');
  const eff = loadFresh('../../src/runtimeStabilization/runtimeEfficiencyEngine');
  const r = eff.computeRuntimeEfficiency({ active_layers: 2, observability_blocks: 2 });
  assert(r.runtime_efficiency > 0.7, 'healthy efficiency');
}

function testOperationalMaturity() {
  console.log('\n=== Operational maturity ===');
  const mat = loadFresh('../../src/runtimeStabilization/operationalCognitiveMaturity');
  const r = mat.evaluateOperationalCognitiveMaturity({ cognitive_runtime_health: 0.92, cognitive_operational_pressure: 0.2 });
  assert(r.operational_cognitive_maturity > 0.8, 'mature operational');
}

function testStabilizationTelemetry() {
  console.log('\n=== Stabilization telemetry ===');
  const tel = loadFresh('../../src/runtimeStabilization/stabilizationTelemetry');
  tel.recordStabilizationSample({ stabilization_score: 0.9 });
  assert(tel.getStabilizationTelemetry().stabilization_score > 0.85, 'telemetry updated');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseO();
  const facade = loadFresh('../../src/runtimeStabilization/runtimeStabilizationFacade');
  const { stabilization } = facade.enrichWithRuntimeStabilization(
    { id: 1, company_id: 2 },
    {},
    {
      force: true,
      semantic_alignment: { phase: 'K' },
      precision_delivery: { phase: 'L' },
      cognitive_convergence: { phase: 'M' },
      enterprise_cognitive_operations: { phase: 'N', entropy: { runtime_entropy_score: 0.2 } }
    }
  );
  assert(stabilization?.phase === 'O', 'phase O block');
  assert(stabilization?.auto_simplify === false, 'no auto simplify');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseO();
  const facade = loadFresh('../../src/runtimeStabilization/runtimeStabilizationFacade');
  const scenarios = [
    ['normal-runtime', { semantic_alignment: {}, precision_delivery: {} }],
    ['high-shadow-runtime', { semantic_alignment: {}, precision_delivery: {}, cognitive_convergence: {}, enterprise_cognitive_operations: {} }],
    ['degraded-runtime', { enterprise_cognitive_operations: { entropy: { runtime_entropy_score: 0.5 }, health: { cognitive_runtime_health: 0.6 } } }],
    ['redundancy-heavy-runtime', { semantic_alignment: {}, precision_delivery: {}, cognitive_convergence: {}, enterprise_cognitive_operations: {}, contextual_modules: {} }],
    ['governance-fatigue-runtime', { semantic_alignment: {}, precision_delivery: {}, cognitive_convergence: {}, enterprise_cognitive_operations: { telemetry_snapshot: { cognitive_operational_pressure: 0.75 } } }],
    ['high-observability-runtime', { semantic_alignment: {}, precision_delivery: {}, cognitive_convergence: {}, enterprise_cognitive_operations: {}, content_exposure: {} }]
  ];
  for (const [file, ctx] of scenarios) {
    const { stabilization } = facade.enrichWithRuntimeStabilization({ id: 1 }, {}, { force: true, ...ctx });
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(stabilization, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Enterprise Runtime Stabilization — Phase O');
  testGovernanceFatigue();
  testRedundancyDetection();
  testRuntimeOverhead();
  testShadowSaturation();
  testOrchestrationOverlap();
  testObservabilityOverload();
  testRuntimeEfficiency();
  testOperationalMaturity();
  testStabilizationTelemetry();
  testFacadeObservability();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
