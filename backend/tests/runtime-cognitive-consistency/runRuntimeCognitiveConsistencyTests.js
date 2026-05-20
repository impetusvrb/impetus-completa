'use strict';

/**
 * npm run test:runtime-cognitive-consistency
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

function resetPhaseQ() {
  delete process.env.IMPETUS_RUNTIME_CONSISTENCY;
  delete process.env.IMPETUS_INTERCHANNEL_CONSISTENCY;
  delete process.env.IMPETUS_TEMPORAL_CONTEXT_STABILIZATION;
  process.env.IMPETUS_RUNTIME_CONSISTENCY_OBSERVABILITY = 'on';
  delete require.cache[require.resolve('../../src/runtimeConsistency/config/phaseQFeatureFlags')];
  loadFresh('../../src/runtimeConsistency/runtimeTruthSynchronizer').clearSynchronizedTruth();
  loadFresh('../../src/runtimeConsistency/temporalContextStabilizer').clearTemporalContext();
  loadFresh('../../src/runtimeConsistency/consistencyTelemetry').resetConsistencyTelemetry();
}

function testTruthSynchronization() {
  console.log('\n=== Truth synchronization ===');
  resetPhaseQ();
  const sync = loadFresh('../../src/runtimeConsistency/runtimeTruthSynchronizer');
  const r = sync.synchronizeRuntimeTruth(
    { id: 1, company_id: 10 },
    {
      runtime_truth_state: { authority: { contextual_truth: { functional_axis: 'quality' } } },
      cognitive_convergence: { runtime_truth_state: { authority: { contextual_truth: { functional_axis: 'quality' } } } }
    },
    { functional_axis: 'quality' }
  );
  assert(r.conflict === false, 'no conflict aligned axes');
  assert(r.runtime_truth_integrity > 0.9, 'integrity high');
}

function testConflictingTruths() {
  console.log('\n=== Conflicting truths ===');
  const sync = loadFresh('../../src/runtimeConsistency/runtimeTruthSynchronizer');
  const r = sync.synchronizeRuntimeTruth(
    { id: 2 },
    {
      runtime_truth_state: { authority: { contextual_truth: { functional_axis: 'quality' } } },
      cognitive_convergence: { runtime_truth_state: { authority: { contextual_truth: { functional_axis: 'safety' } } } }
    },
    {}
  );
  assert(r.conflict === true, 'conflict detected');
}

function testInterchannelConsistency() {
  console.log('\n=== Interchannel consistency ===');
  const coord = loadFresh('../../src/runtimeConsistency/interchannelConsistencyCoordinator');
  const r = coord.coordinateInterchannelConsistency(
    { id: 1 },
    { dashboard: { axis: 'safety' }, kpi: { domain: 'safety' }, summary: { runtime_truth_reference: 'safety' } },
    { functional_axis: 'safety' }
  );
  assert(r.divergent === false, 'channels aligned');
  assert(r.interchannel_alignment > 0.8, 'alignment high');
}

function testInterchannelDivergence() {
  console.log('\n=== Interchannel divergence ===');
  const engine = loadFresh('../../src/runtimeConsistency/cognitiveConsistencyEngine');
  const r = engine.assessCognitiveConsistency(
    { id: 1 },
    { dashboard: { axis: 'quality' }, kpi: { domain: 'safety' }, summary: { runtime_truth_reference: 'hr' } },
    { functional_axis: 'quality' }
  );
  assert(r.coordination.divergent === true, 'divergence flagged');
}

function testKpiSummaryConsistency() {
  console.log('\n=== KPI/summary consistency ===');
  const sumVal = loadFresh('../../src/runtimeConsistency/summaryConsistencyValidator');
  const r = sumVal.validateSummaryConsistency(
    { runtime_truth_reference: 'quality' },
    { canonical_axis: 'quality' },
    { functional_axis: 'quality' }
  );
  assert(r.consistent === true, 'kpi summary aligned');
  const bad = sumVal.validateSummaryConsistency(
    { runtime_truth_reference: 'safety' },
    { canonical_axis: 'quality' },
    { functional_axis: 'quality' }
  );
  assert(bad.consistent === false, 'misaligned summary');
}

function testDashboardChatConsistency() {
  console.log('\n=== Dashboard/chat consistency ===');
  const chat = loadFresh('../../src/runtimeConsistency/chatConsistencyValidator');
  const ok = chat.validateChatConsistency({ functional_axis: 'safety', dashboard_severity: 'high' }, { canonical_axis: 'safety' });
  const bad = chat.validateChatConsistency(
    { functional_axis: 'quality', dashboard_severity: 'high', severity: 'low' },
    { canonical_axis: 'quality' }
  );
  assert(ok.consistent === true, 'chat aligned');
  assert(bad.consistent === false, 'severity mismatch');
}

function testTemporalStabilization() {
  console.log('\n=== Temporal stabilization ===');
  const temp = loadFresh('../../src/runtimeConsistency/runtimeTemporalConsistency');
  const sync = { canonical_axis: 'environmental' };
  const r = temp.evaluateRuntimeTemporalConsistency({ id: 3 }, sync, { functional_axis: 'environmental' });
  assert(r.temporal_consistency > 0.8, 'temporal ok first pass');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseQ();
  const facade = loadFresh('../../src/runtimeConsistency/runtimeConsistencyFacade');
  const { runtime_consistency } = facade.enrichWithRuntimeConsistency(
    { id: 1, functional_axis: 'quality', company_id: 10 },
    { visible_modules: ['quality'], functional_axis: 'quality' },
    {
      force: true,
      cognitive_convergence: {
        runtime_truth_state: { authority: { contextual_truth: { functional_axis: 'quality' } } }
      },
      contextual_delivery: { targeting: { domain: { domain: 'quality' } } }
    }
  );
  assert(runtime_consistency?.phase === 'Q', 'phase Q');
  assert(runtime_consistency?.auto_enforce === false, 'no auto enforce');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseQ();
  const facade = loadFresh('../../src/runtimeConsistency/runtimeConsistencyFacade');
  const personas = [
    ['executive', 'executive', 1],
    ['coordinator', 'safety', 3],
    ['operator', 'operations', 5],
    ['environmental', 'environmental', 4],
    ['quality', 'quality', 4],
    ['safety', 'safety', 4],
    ['financial', 'financial', 3]
  ];
  for (const [file, axis, level] of personas) {
    const { runtime_consistency } = facade.enrichWithRuntimeConsistency(
      { id: 1, company_id: 99, functional_axis: axis, hierarchy_level: level },
      { functional_axis: axis },
      {
        force: true,
        cognitive_convergence: {
          runtime_truth_state: { authority: { contextual_truth: { functional_axis: axis } } }
        }
      }
    );
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(runtime_consistency, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Runtime Cognitive Consistency — Phase Q');
  testTruthSynchronization();
  testConflictingTruths();
  testInterchannelConsistency();
  testInterchannelDivergence();
  testKpiSummaryConsistency();
  testDashboardChatConsistency();
  testTemporalStabilization();
  testFacadeObservability();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
