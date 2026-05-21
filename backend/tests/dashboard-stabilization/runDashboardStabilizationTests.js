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

function main() {
  console.log('Dashboard Stabilization — Phase Z.3');
  process.env.IMPETUS_PILOT_RUNTIME_OBSERVABILITY = 'on';
  const s = loadFresh('../../src/dashboardStabilization/dashboardStabilizationFacade');
  const r = s.stabilizeDashboard({ kpis: [{ key: 'k1' }], sections: [] }, {}, {});
  assert(r.payload_unchanged === true, 'payload unchanged');
  assert(r.recommendation_only === true, 'recommendation only');
  const e = loadFresh('../../src/dashboardStabilization/emptyDashboardProtection');
  assert(e.protectEmptyDashboard({}).frontend_safe === true, 'empty safe');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
