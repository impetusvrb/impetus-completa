'use strict';

/**
 * npm run test:cognitive-runtime-convergence
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

function resetPhaseM() {
  delete process.env.IMPETUS_UNIFIED_COGNITIVE_CONTEXT;
  delete process.env.IMPETUS_RUNTIME_TRUTH_AUTHORITY;
  delete process.env.IMPETUS_GOVERNED_AI_ORCHESTRATION;
  delete process.env.IMPETUS_COGNITIVE_CONSISTENCY_VALIDATION;
  delete process.env.IMPETUS_CONTEXT_DRIFT_DETECTION;
  process.env.IMPETUS_COGNITIVE_CONVERGENCE_OBSERVABILITY = 'on';
  delete require.cache[require.resolve('../../src/cognitiveConvergence/config/phaseMFeatureFlags')];
  loadFresh('../../src/cognitiveConvergence/runtimeTruthState').clearRuntimeTruthState();
}

function testContextConvergence() {
  console.log('\n=== Context convergence ===');
  resetPhaseM();
  const engine = loadFresh('../../src/cognitiveConvergence/unifiedCognitiveContextEngine');
  const r = engine.buildUnifiedCognitiveContext(
    { id: 1, company_id: 10, functional_axis: 'quality', hierarchy_level: 3 },
    { visible_modules: ['quality', 'dashboard'], force_observe: true }
  );
  assert(r.shadow_only === true, 'shadow default');
  assert(r.runtime_truth_state?.authority, 'truth authority present');
}

function testTruthConsistency() {
  console.log('\n=== Truth consistency ===');
  const resolver = loadFresh('../../src/cognitiveConvergence/runtimeTruthResolver');
  const r = resolver.resolveRuntimeTruth({ id: 2, company_id: 1, functional_axis: 'safety' }, {});
  assert(r.runtime_truth_confidence > 0.5, 'confidence score');
  assert(r.runtime_truth_state.semantic, 'semantic assembly');
}

function testSummaryConsistency() {
  console.log('\n=== Summary consistency ===');
  const sum = loadFresh('../../src/cognitiveConvergence/unifiedSummaryTruthResolver');
  const r = sum.resolveSummaryTruth({ text: 'ok', sources: ['db'] }, { id: 1, functional_axis: 'hr' }, {});
  assert(r.consistent === true, 'summary with provenance consistent');
}

function testKpiConsistency() {
  console.log('\n=== KPI consistency ===');
  const kpi = loadFresh('../../src/cognitiveConvergence/unifiedKpiTruthResolver');
  const r = kpi.resolveKpiTruth([{ id: 'k1', domain: 'quality' }], { id: 1, functional_axis: 'quality' }, {});
  assert(r.consistent === true, 'kpi domain match');
  const bad = kpi.resolveKpiTruth([{ id: 'k2', domain: 'safety' }], { id: 1, functional_axis: 'quality' }, {});
  assert(bad.consistent === false, 'kpi mismatch detected');
}

function testInsightConsistency() {
  console.log('\n=== Insight consistency ===');
  const ins = loadFresh('../../src/cognitiveConvergence/unifiedInsightResolver');
  const r = ins.resolveInsightTruth([{ domain: 'safety' }], { id: 1, functional_axis: 'safety' }, {});
  assert(r.consistent === true, 'insights aligned');
}

function testDriftDetection() {
  console.log('\n=== Drift detection ===');
  resetPhaseM();
  const det = loadFresh('../../src/cognitiveConvergence/contextDriftDetector');
  const r = det.detectContextDrift(
    { contextual_truth: { functional_axis: 'quality' }, runtime_truth_confidence: 0.9 },
    { contextual_truth: { functional_axis: 'safety' }, runtime_truth_confidence: 0.5 }
  );
  assert(r.drift_detected === true, 'axis drift detected');
}

function testFragmentationDetection() {
  console.log('\n=== Fragmentation detection ===');
  const det = loadFresh('../../src/cognitiveConvergence/runtimeTruthDeviationDetector');
  const r = det.detectFragmentation({ redundant_builders: ['smart_summary', 'legacy', 'enricher_x'] });
  assert(r.fragmentation_detected === true, 'fragmentation flagged');
}

function testConvergenceIntegrity() {
  console.log('\n=== Convergence integrity ===');
  const val = loadFresh('../../src/cognitiveConvergence/convergenceIntegrityValidator');
  const r = val.validateConvergenceIntegrity({ convergence_rate: 0.9, cognitive_fragmentation_rate: 0.05 });
  assert(r.valid === true, 'integrity valid');
  assert(typeof r.convergence_confidence === 'number', 'convergence confidence');
}

function testSemanticConvergence() {
  console.log('\n=== Semantic convergence ===');
  const asm = loadFresh('../../src/cognitiveConvergence/unifiedSemanticAssembly');
  const r = asm.assembleSemanticTruth(
    { runtime_truth_confidence: 0.88, contextual_truth: { functional_axis: 'executive' } },
    { composition: { operational: { visible_modules: ['executive'] } }, contextual_unification_score: 0.9 }
  );
  assert(parseFloat(r.semantic_convergence_rate) > 0.8, 'semantic rate');
}

function testRuntimeTruthValidation() {
  console.log('\n=== Runtime truth validation ===');
  const val = loadFresh('../../src/cognitiveConvergence/cognitiveConsistencyValidator');
  const r = val.validateCognitiveConsistency({
    kpi_truth: { kpi_truth: { axis: 'quality' } },
    summary_truth: { summary_truth: { axis: 'safety' } }
  });
  assert(r.valid === true, 'no critical on axis mismatch alone');
  assert(r.issues.length > 0, 'issues logged');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseM();
  const facade = loadFresh('../../src/cognitiveConvergence/cognitiveConvergenceFacade');
  const { convergence } = facade.enrichWithCognitiveConvergence(
    { id: 1, company_id: 2, functional_axis: 'environmental' },
    { visible_modules: ['dashboard'], functional_axis: 'environmental' },
    { force: true }
  );
  assert(convergence?.phase === 'M', 'phase M block');
  assert(convergence?.runtime_truth_state, 'runtime truth in block');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseM();
  const facade = loadFresh('../../src/cognitiveConvergence/cognitiveConvergenceFacade');
  const personas = [
    ['executive', 'executive', ['executive', 'analytics']],
    ['hr', 'hr', ['hr', 'dashboard']],
    ['quality', 'quality', ['quality', 'reports']],
    ['safety', 'safety', ['sst', 'dashboard']],
    ['environmental', 'environmental', ['environment_intelligence']],
    ['operational', 'operations', ['maintenance', 'sst']],
    ['cross-domain', 'safety', ['quality', 'sst', 'environment_intelligence']],
    ['tenant-shared', 'quality', ['reports', 'analytics', 'dashboard']]
  ];
  for (const [file, axis, mods] of personas) {
    const { convergence } = facade.enrichWithCognitiveConvergence(
      { id: 1, company_id: 99, functional_axis: axis, hierarchy_level: 3 },
      { visible_modules: mods, functional_axis: axis },
      { force: true }
    );
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(convergence, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Cognitive Runtime Convergence — Phase M');
  testContextConvergence();
  testTruthConsistency();
  testSummaryConsistency();
  testKpiConsistency();
  testInsightConsistency();
  testDriftDetection();
  testFragmentationDetection();
  testConvergenceIntegrity();
  testSemanticConvergence();
  testRuntimeTruthValidation();
  testFacadeObservability();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
