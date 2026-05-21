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
  console.log('KPI Underdelivery Hardening — Phase Z.6');
  process.env.IMPETUS_KPI_RUNTIME_STABILITY_OBSERVABILITY = 'on';
  const u = loadFresh('../../src/kpiUnderdeliveryHardening/kpiUnderdeliveryHardeningFacade');
  const critical = u.hardenKpiUnderdelivery([], { hierarchy_tier: 'operational' });
  assert(critical.critical.dangerously_empty === true, 'critical empty');
  const op = u.hardenKpiUnderdelivery([{ key: 'x', domain: 'hr' }], { hierarchy_tier: 'operational' });
  assert(op.operational.operational_blindness === true, 'operational blindness');
  const exec = u.hardenKpiUnderdelivery([{ key: 'ops' }], { hierarchy_tier: 'executive' });
  assert(exec.executive.executive_blindness === true, 'executive blindness');
  const min = loadFresh('../../src/kpiOperationalMinimums/contextualMinimumProtection');
  const g = min.applyContextualMinimumProtection(
    [{ key: 'oee', domain: 'operations' }],
    [{ key: 'oee', domain: 'operations' }, { key: 'line', domain: 'operations' }],
    { hierarchy_tier: 'operational' }
  );
  assert(g.fabricated === false, 'no artificial kpi');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
