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
  process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION = 'on';
  process.env.IMPETUS_PILOT_TENANT_ENFORCEMENT = 'on';
  process.env.IMPETUS_SAFE_MENU_ENFORCEMENT = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/realMenuGovernance/') || k.includes('/realTenantEnforcement/') || k.includes('/pilotTenants/') || k.includes('/contextualActivation/')) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
}

function testRhLosesSst() {
  console.log('\n=== RH perde SST ===');
  reset();
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant('z13-hr', { approved_by: 'ops' });
  loadFresh('../../src/contextualActivation/tenantEnforcementState').setTenantEnforcementActive('z13-hr', true, {
    approved_by: 'ops',
    channels: { menu: true }
  });
  const f = loadFresh('../../src/realMenuGovernance/realMenuGovernanceFacade');
  const r = f.applyRealMenuGovernance(
    ['dashboard', 'settings', 'hr_intelligence', 'safety_intelligence'],
    { company_id: 'z13-hr', department: 'RH', job_title: 'Gerente RH' },
    { canonical_identity: { domain_axis: 'hr', hierarchy_level: 2, hierarchy_tier: 'management' }, force_real_menu: true }
  );
  assert(r.visible_modules.includes('dashboard'), 'dashboard');
  assert(!r.visible_modules.includes('safety_intelligence'), 'no sst');
}

function testFallbackPreserved() {
  console.log('\n=== Fallback preservado ===');
  reset();
  const stable = loadFresh('../../src/realMenuGovernance/menuGovernanceStability');
  const r = stable.stabilizeMenuGovernance([], { canonical_identity: { domain_axis: 'quality' } });
  assert(r.visible_modules.includes('dashboard'), 'survival dashboard');
}

function main() {
  console.log('Real Menu Governance — Phase Z.13');
  testRhLosesSst();
  testFallbackPreserved();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main();
