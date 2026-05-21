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
  console.log('KPI Safety — Phase Z.5');
  process.env.IMPETUS_KPI_PILOT_OBSERVABILITY = 'on';
  const safety = loadFresh('../../src/kpiSafety/kpiSafetyFacade');
  const kpis = [
    { key: 'hr_kpi', domain: 'hr' },
    { key: 'sst_kpi', domain: 'safety' }
  ];
  const r = safety.validateKpiSafety(
    { department: 'RH' },
    kpis,
    { domain_axis: 'hr', hierarchy_tier: 'coordination', functional_axis: 'hr' }
  );
  assert(r.leakage.leakage_detected === true, 'leakage detected');
  const op = safety.validateKpiSafety(
    { role: 'operador' },
    [{ key: 'board', domain: 'executive' }],
    { hierarchy_tier: 'operational' }
  );
  assert(op.underdelivery.critical === true || op.leakage.leakage_detected, 'operator risk');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
