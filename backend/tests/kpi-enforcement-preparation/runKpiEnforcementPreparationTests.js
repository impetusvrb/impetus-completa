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
  console.log('KPI Enforcement Preparation — Phase Z.4');
  process.env.IMPETUS_KPI_ENFORCEMENT_PREPARATION = 'on';
  process.env.IMPETUS_PILOT_OBSERVABILITY = 'on';
  const kpi = loadFresh('../../src/kpiEnforcementPreparation/kpiPreparationFacade');
  const kpis = [
    { key: 'hr_turnover', domain: 'hr' },
    { key: 'sst_incidents', domain: 'safety' },
    { key: 'board_esg', domain: 'executive' }
  ];
  const prep = kpi.prepareKpiEnforcement(
    { role: 'gerente', department: 'RH' },
    { kpis },
    { canonical_identity: { domain_axis: 'hr', hierarchy_tier: 'coordination' } }
  );
  assert(prep.enforcement_applied === false, 'simulation only');
  assert(prep.visibility_simulation.would_hide.length >= 1, 'KPI leakage simulated');
  assert(prep.payload_unchanged === true, 'payload unchanged');
  const op = kpi.prepareKpiEnforcement(
    { role: 'operador' },
    { kpis: [{ key: 'board_esg', domain: 'executive' }] },
    { canonical_identity: { hierarchy_tier: 'operational' } }
  );
  assert(op.leakage_detected || op.visibility_simulation.would_hide.length > 0, 'executive leakage sim');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
