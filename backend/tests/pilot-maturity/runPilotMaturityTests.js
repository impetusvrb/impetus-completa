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
function reset() {
  process.env.IMPETUS_PILOT_MATURITY_ENGINE = 'on';
  process.env.IMPETUS_PILOT_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/pilotMaturity/') || k.includes('/pilotTenants/')) delete require.cache[k];
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant('maturity-pilot', { approved_by: 'ops' });
}

function main() {
  console.log('Pilot Maturity — Phase Z.4');
  reset();
  const m = loadFresh('../../src/pilotMaturity/pilotMaturityFacade');
  const r = m.assessPilotMaturity('maturity-pilot', { company_id: 'maturity-pilot', department: 'RH' }, {
    force: true,
    canonical_identity: { domain_axis: 'hr', hierarchy_tier: 'coordination', hierarchy_level: 3 },
    visible_modules: ['dashboard', 'settings', 'hr_intelligence']
  });
  assert(r.maturity_score > 0, 'maturity score');
  assert(r.kpi_enforcement_applied === false, 'no kpi enforcement');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
