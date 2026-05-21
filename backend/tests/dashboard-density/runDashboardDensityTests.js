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
function loadFresh(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}

function testGenericReducesDensity() {
  console.log('\n=== Dashboard genérico reduz density ===');
  process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_OBSERVABILITY = 'on';
  const a = loadFresh('../../src/dashboardDensity/dashboardDensityAnalyzer');
  const r = a.analyzeDashboardDensity({ generic_dashboard: true, functional_axis: 'unknown', widgets: 5 });
  assert(r.density_score < 0.65, 'low density');
}

function testSimulationOnly() {
  console.log('\n=== Reducer simulation only ===');
  const s = loadFresh('../../src/dashboardDensity/contextualDensitySupervisor').superviseContextualDensity({
    hierarchy_level: 1,
    widgets: 20,
    generic_dashboard: false
  });
  assert(s.auto_apply === false, 'no apply');
}

function main() {
  console.log('Dashboard Density — Phase Z.1');
  testGenericReducesDensity();
  testSimulationOnly();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
