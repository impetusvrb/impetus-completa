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
  process.env.IMPETUS_PILOT_OBSERVABILITY = 'on';
  process.env.IMPETUS_MENU_STABILITY_ANALYSIS = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/pilotTenants/') || k.includes('/pilotOperationalStabilization/') || k.includes('/menuEnforcementStabilization/')) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant('stab-pilot', { approved_by: 'ops' });
}

function main() {
  console.log('Pilot Operational Stabilization — Phase Z.4');
  reset();
  const stab = loadFresh('../../src/pilotOperationalStabilization/pilotOperationalStabilizationFacade');
  const menu = loadFresh('../../src/menuEnforcementStabilization/menuEnforcementStabilizationFacade');
  const ms = menu.stabilizeMenuEnforcement(
    ['dashboard', 'hr_intelligence', 'safety_intelligence', 'environment_intelligence'],
    ['dashboard', 'settings', 'hr_intelligence'],
    { tenant_id: 'stab-pilot', canonical_identity: { domain_axis: 'hr', hierarchy_tier: 'coordination' } }
  );
  assert(ms.menu_stability.stable !== false || ms.shared_module_safety.shared_module_safe, 'menu stable or shared safe');
  const r = stab.stabilizePilotOperational(
    { company_id: 'stab-pilot', department: 'RH' },
    { visible_modules: ['dashboard', 'settings', 'hr_intelligence'] },
    { force: true, canonical_identity: { domain_axis: 'hr', hierarchy_tier: 'coordination' } }
  );
  assert(r.pilot_operational_stabilization?.kpi_enforcement_applied === false, 'no kpi filter');
  assert(r.response.visible_modules.includes('dashboard'), 'dashboard preserved');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
