'use strict';

/**
 * npm run test:runtime-data-integrity
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
    if (d) console.log('       ', JSON.stringify(d).slice(0, 400));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function resetPhaseX() {
  delete process.env.IMPETUS_RUNTIME_ENRICHMENT;
  delete process.env.IMPETUS_OPERATIONAL_SIGNAL_ANALYSIS;
  delete process.env.IMPETUS_CONTEXTUAL_DENSITY_ENGINE;
  delete process.env.IMPETUS_DASHBOARD_ENRICHMENT;
  delete process.env.IMPETUS_TELEMETRY_GAP_DETECTION;
  process.env.IMPETUS_RUNTIME_ENRICHMENT_OBSERVABILITY = 'on';
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/runtimeEnrichment/')) delete require.cache[key];
  }
  loadFresh('../../src/runtimeEnrichment/runtimeEnrichmentTelemetry').resetEnrichmentTelemetry();
}

const GOOD_KPIS = {
  kpis: [
    { id: 'nc', domain: 'quality', value: 2.1, source: 'plc', provenance: 'line2' },
    { id: 'pass', domain: 'quality', value: 97, source: 'mes' }
  ]
};

const WEAK_KPIS = {
  kpis: [{ id: 'orphan', generic_fallback: true }]
};

function testSignalIntegrity() {
  console.log('\n=== Signal integrity ===');
  resetPhaseX();
  const ana = loadFresh('../../src/runtimeEnrichment/operationalSignalIntegrityAnalyzer');
  const good = ana.analyzeOperationalSignalIntegrity(GOOD_KPIS, { channel: 'kpi' });
  const weak = ana.analyzeOperationalSignalIntegrity(WEAK_KPIS, { channel: 'kpi' });
  assert(good.signal_integrity_score >= 0.8, 'good signals');
  assert(weak.issues.length >= 1, 'weak detected');
  assert(good.invented_data === false, 'no invented data');
}

function testContextualDensity() {
  console.log('\n=== Contextual density ===');
  resetPhaseX();
  const eng = loadFresh('../../src/runtimeEnrichment/contextualDataDensityEngine');
  const r = eng.measureContextualDataDensity(
    { kpis: GOOD_KPIS.kpis, visible_modules: ['m1', 'm2'] },
    { contextual_delivery: { contextual_delivery_confidence: 0.88 } }
  );
  assert(r.runtime_density_score >= 0.6, 'density');
  assert(r.invented_metrics === false, 'no invented metrics');
}

function testTelemetryGaps() {
  console.log('\n=== Telemetry gaps ===');
  resetPhaseX();
  const det = loadFresh('../../src/runtimeEnrichment/runtimeTelemetryGapDetector');
  const r = det.detectTelemetryGaps({}, { metrics: { data_state: 'tenant_empty' } });
  assert(r.gaps_detected === true, 'gap detected');
  assert(r.auto_fill === false, 'no auto fill');
}

function testDashboardUsefulness() {
  console.log('\n=== Dashboard usefulness ===');
  resetPhaseX();
  const dash = loadFresh('../../src/runtimeEnrichment/dashboardSemanticEnrichmentEngine');
  const ok = dash.enrichDashboardSemantics({ visible_modules: ['a', 'b'], widgets: [{ id: 'w1' }] });
  const empty = dash.enrichDashboardSemantics({ visible_modules: [] });
  assert(ok.dashboard_usefulness >= 0.9, 'useful dashboard');
  assert(empty.issues.some((i) => i.type === 'semantically_empty_dashboard'), 'empty dashboard');
}

function testInsightUtility() {
  console.log('\n=== Insight utility ===');
  resetPhaseX();
  const ins = loadFresh('../../src/runtimeEnrichment/insightGenerationIntegrityEngine');
  const r = ins.validateInsightGenerationIntegrity({
    insights: [{ id: '1', text: 'Recomenda verificar setup linha 2 antes do turno com meta NC < 2.5%.' }]
  });
  assert(r.insight_utility_score >= 0.7, 'utility');
}

function testEnrichmentIntegrity() {
  console.log('\n=== Enrichment integrity ===');
  resetPhaseX();
  const val = loadFresh('../../src/runtimeEnrichment/contextualEnrichmentValidator');
  const r = val.validateContextualEnrichment(
    {},
    {
      functional_axis: 'quality',
      precision_delivery: { functional_axis: 'quality' },
      contextual_delivery: { contextual_delivery_confidence: 0.9 }
    }
  );
  assert(r.valid === true, 'coherent enrichment');
}

function testPipelineCoordinator() {
  console.log('\n=== Pipeline coordinator ===');
  resetPhaseX();
  const coord = loadFresh('../../src/runtimeEnrichment/enrichmentPipelineCoordinator');
  const r = coord.coordinateEnrichment('kpi', GOOD_KPIS, { channel: 'kpi' });
  assert(r.pipeline_legacy_preserved === true, 'legacy preserved');
  assert(r.auto_substitute === false, 'no substitute');
}

function testOperationalEnrichment() {
  console.log('\n=== Operational enrichment ===');
  resetPhaseX();
  const eng = loadFresh('../../src/runtimeEnrichment/runtimeOperationalEnrichmentEngine');
  const r = eng.enrichRuntimeOperational({ functional_axis: 'quality' }, GOOD_KPIS, { channel: 'kpi' });
  assert(r.invented_data === false, 'no invent');
  assert(r.auto_remediate === false, 'no auto remediate');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseX();
  const facade = loadFresh('../../src/runtimeEnrichment/runtimeEnrichmentFacade');
  const r = facade.enrichWithRuntimeDataIntegrity(
    { id: 1, functional_axis: 'quality', company_id: 1 },
    { kpis: GOOD_KPIS.kpis, visible_modules: ['q1'] },
    { force: true, channel: 'me' }
  );
  assert(r.runtime_enrichment?.phase === 'X', 'phase X');
  assert(r.operational_density?.runtime_density_score != null, 'density block');
  assert(r.enrichment_integrity?.enrichment_integrity_score != null, 'integrity');
  assert(r.telemetry_integrity != null, 'telemetry');
  assert(r.semantic_enrichment != null, 'semantic');
  assert(r.operational_signal_quality != null, 'signals');
}

function testFeatureFlags() {
  console.log('\n=== Feature flags ===');
  resetPhaseX();
  const f = loadFresh('../../src/runtimeEnrichment/config/phaseXFeatureFlags');
  assert(f.isRuntimeEnrichmentEnabled() === false, 'enrichment off');
  assert(f.isRuntimeEnrichmentObservabilityEnabled() === true, 'observability on');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseX();
  const facade = loadFresh('../../src/runtimeEnrichment/runtimeEnrichmentFacade');
  const personas = [
    ['executive', 'executive'],
    ['director', 'operations'],
    ['coordinator', 'safety'],
    ['supervisor', 'quality'],
    ['operator', 'operations'],
    ['hr', 'hr'],
    ['financial', 'financial'],
    ['quality', 'quality'],
    ['environmental', 'environmental'],
    ['safety', 'safety'],
    ['logistics', 'logistics'],
    ['engineering', 'operations'],
    ['maintenance', 'operations']
  ];
  for (const [file, axis] of personas) {
    const r = facade.enrichWithRuntimeDataIntegrity(
      { id: 1, functional_axis: axis, role: file },
      {
        kpis: [{ id: `${axis}_kpi`, domain: axis, value: 10, source: 'test' }],
        visible_modules: [`${axis}_mod`]
      },
      { force: true, channel: 'me', functional_axis: axis }
    );
    const snap = {
      runtime_enrichment: r.runtime_enrichment,
      operational_density: r.operational_density,
      operational_signal_quality: r.operational_signal_quality
    };
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(snap, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Runtime Data Integrity — Phase X');
  testSignalIntegrity();
  testContextualDensity();
  testTelemetryGaps();
  testDashboardUsefulness();
  testInsightUtility();
  testEnrichmentIntegrity();
  testPipelineCoordinator();
  testOperationalEnrichment();
  testFacadeObservability();
  testFeatureFlags();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
