'use strict';

/**
 * npm run test:runtime-delivery-precision
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

function resetPhaseL() {
  delete process.env.IMPETUS_PRECISE_MODULE_DELIVERY;
  delete process.env.IMPETUS_PRECISE_TOOL_EXPOSURE;
  delete process.env.IMPETUS_PRECISE_WIDGET_GOVERNANCE;
  delete process.env.IMPETUS_PRECISE_KPI_ALIGNMENT;
  delete process.env.IMPETUS_PRECISE_SUMMARY_ENGINE;
  process.env.IMPETUS_RUNTIME_PRECISION_OBSERVABILITY = 'on';
  delete require.cache[require.resolve('../../src/precisionRuntime/config/phaseLFeatureFlags')];
}

function testModuleExactness() {
  console.log('\n=== Module exactness ===');
  resetPhaseL();
  const engine = loadFresh('../../src/precisionRuntime/preciseModuleDeliveryEngine');
  const r = engine.deliverModules(
    { id: 1, functional_axis: 'safety', company_id: 10 },
    { visible_modules: ['sst', 'quality', 'dashboard'], functional_axis: 'safety' }
  );
  assert(r.shadow_only === true, 'shadow by default');
  assert(typeof r.module_delivery_confidence === 'number', 'confidence score');
  assert(Array.isArray(r.precise_modules), 'precise modules list');
}

function testWidgetExactness() {
  console.log('\n=== Widget exactness ===');
  resetPhaseL();
  const resolver = loadFresh('../../src/precisionRuntime/widgetExactnessResolver');
  const r = resolver.resolveWidgetExactness(
    [{ id: 'w1', domain: 'safety' }, { id: 'w2', domain: 'quality' }],
    { id: 1, functional_axis: 'safety' },
    { functional_axis: 'safety' }
  );
  assert(r.shadow_only === true, 'widget shadow');
  assert(r.ineligible.length >= 1, 'domain mismatch widget flagged');
}

function testKpiPrecision() {
  console.log('\n=== KPI precision ===');
  resetPhaseL();
  const kpi = loadFresh('../../src/precisionRuntime/preciseKpiResolver');
  const r = kpi.resolvePreciseKpis(
    { kpis: [{ id: 'k1', generic_fallback: true }] },
    { id: 1, functional_axis: 'quality', company_id: 1 },
    { domain: 'quality' }
  );
  assert(r.shadow_only === true, 'kpi shadow');
  assert(r.issues.some((i) => i.issue === 'generic_fallback_residual'), 'generic fallback detected');
}

function testSummaryPrecision() {
  console.log('\n=== Summary precision ===');
  resetPhaseL();
  const sum = loadFresh('../../src/precisionRuntime/preciseSummaryEngine');
  const r = sum.resolvePreciseSummary(
    { text: 'x', synthetic: true },
    { id: 1, company_id: 1 },
    {}
  );
  assert(r.shadow_only === true, 'summary shadow');
  assert(r.precision.valid === false || r.precision.issues.length > 0, 'missing provenance flagged');
}

function testContextualPrecision() {
  console.log('\n=== Contextual precision ===');
  const ctx = loadFresh('../../src/precisionRuntime/contextualPrecisionEngine');
  const r = ctx.computeContextualPrecision({ company_id: 1, hierarchy_level: 3 }, { functional_axis: 'safety' });
  assert(r.contextual_precision_score > 0.5, 'score with axis');
  assert(r.sufficient === true, 'sufficient context');
}

function testOverdelivery() {
  console.log('\n=== Overdelivery detection ===');
  const cmp = loadFresh('../../src/precisionRuntime/runtimePrecisionComparator');
  const r = cmp.compareLegacyVsPrecise(
    { visible_modules: ['quality', 'sst', 'extra'] },
    { precise_modules: ['sst'] }
  );
  assert(r.overdelivery.includes('quality') || r.overdelivery.includes('extra'), 'overdelivery detected');
}

function testUnderdelivery() {
  console.log('\n=== Underdelivery detection ===');
  const cmp = loadFresh('../../src/precisionRuntime/runtimePrecisionComparator');
  const r = cmp.compareLegacyVsPrecise({ visible_modules: ['sst'] }, { precise_modules: ['sst', 'dashboard'] });
  assert(r.underdelivery.includes('dashboard'), 'underdelivery detected');
}

function testDomainMismatch() {
  console.log('\n=== Domain mismatch ===');
  const cmp = loadFresh('../../src/precisionRuntime/runtimePrecisionComparator');
  const r = cmp.compareDomainVsExposure('safety', [{ domain: 'quality' }, { domain: 'safety' }]);
  assert(r.mismatch_count === 1, 'one mismatch');
}

function testToolExposureShadow() {
  console.log('\n=== Tool exposure ===');
  resetPhaseL();
  process.env.IMPETUS_PRECISE_TOOL_EXPOSURE = 'off';
  const vis = loadFresh('../../src/precisionRuntime/governedToolVisibilityEngine');
  const r = vis.computeToolVisibility(['executive_brief', 'operational_actions'], { hierarchy_level: 5, functional_axis: 'safety' });
  assert(r.shadow_only === true, 'tools shadow');
  assert(r.ineligible.length >= 1, 'some tools ineligible');
}

function testDeliveryConfidence() {
  console.log('\n=== Delivery confidence ===');
  const val = loadFresh('../../src/precisionRuntime/precisionRuntimeValidator');
  const r = val.validatePrecisionRuntime(
    { visible_modules: ['a', 'b'] },
    { precise_modules: ['a'] },
    { shadow_mode: true }
  );
  assert(typeof r.delivery_precision_score === 'number', 'precision score');
  assert(r.issues.length > 0, 'issues on mismatch');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseL();
  const facade = loadFresh('../../src/precisionRuntime/precisionRuntimeFacade');
  const { precision } = facade.enrichDashboardMePrecision(
    { id: 1, functional_axis: 'quality', company_id: 2, hierarchy_level: 4 },
    { visible_modules: ['quality', 'dashboard'], functional_axis: 'quality' },
    { force: true }
  );
  assert(precision?.phase === 'L', 'phase L block');
  assert(precision?.shadow_only === true, 'shadow in facade');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseL();
  const facade = loadFresh('../../src/precisionRuntime/precisionRuntimeFacade');
  const personas = [
    ['quality', { functional_axis: 'quality', company_id: 1, hierarchy_level: 3 }, ['quality', 'dashboard', 'reports']],
    ['safety', { functional_axis: 'safety', company_id: 1, hierarchy_level: 4 }, ['sst', 'dashboard', 'quality']],
    ['environmental', { functional_axis: 'environmental', company_id: 1, hierarchy_level: 4 }, ['environment_intelligence', 'dashboard']],
    ['hr', { functional_axis: 'hr', company_id: 1, hierarchy_level: 3 }, ['hr', 'dashboard']],
    ['executive', { functional_axis: 'executive', company_id: 1, hierarchy_level: 2 }, ['executive', 'analytics', 'dashboard']],
    ['operational', { functional_axis: 'operations', company_id: 1, hierarchy_level: 5 }, ['maintenance', 'sst', 'dashboard']],
    ['tenant-shared', { functional_axis: 'quality', company_id: 99, hierarchy_level: 3 }, ['reports', 'analytics', 'dashboard']]
  ];
  for (const [file, user, mods] of personas) {
    const { precision } = facade.enrichDashboardMePrecision(
      { id: 1, ...user },
      { visible_modules: mods, functional_axis: user.functional_axis },
      { force: true }
    );
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(precision, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Runtime Delivery Precision — Phase L');
  testModuleExactness();
  testWidgetExactness();
  testKpiPrecision();
  testSummaryPrecision();
  testContextualPrecision();
  testOverdelivery();
  testUnderdelivery();
  testDomainMismatch();
  testToolExposureShadow();
  testDeliveryConfidence();
  testFacadeObservability();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
