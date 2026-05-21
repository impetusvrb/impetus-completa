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
  process.env.IMPETUS_TENANT_CONTEXTUAL_ENFORCEMENT = 'on';
  process.env.IMPETUS_SAFE_MENU_ENFORCEMENT = 'on';
  for (const k of Object.keys(require.cache)) {
    if (
      k.includes('/realTenantEnforcement/') ||
      k.includes('/pilotTenants/') ||
      k.includes('/contextualActivation/')
    ) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
}

function testActivationRequiresExecute() {
  console.log('\n=== Ativação exige execute + approved_by ===');
  reset();
  const c = loadFresh('../../src/realTenantEnforcement/tenantRuntimeActivationCoordinator');
  const r = c.coordinateRealTenantRuntimeActivation('tenant-z13', {}, { execute: false });
  assert(!r.activated && r.prepared, 'prepared only');
}

function testRealEnforcementQualityMenu() {
  console.log('\n=== Qualidade perde SST no menu real ===');
  reset();
  const reg = loadFresh('../../src/pilotTenants/pilotTenantRegistry');
  reg.registerPilotTenant('z13-quality', { approved_by: 'ops@test' });
  loadFresh('../../src/contextualActivation/tenantEnforcementState').setTenantEnforcementActive('z13-quality', true, {
    approved_by: 'ops@test',
    channels: { menu: true, kpi: true }
  });
  const f = loadFresh('../../src/realTenantEnforcement/realTenantEnforcementFacade');
  const user = { company_id: 'z13-quality', job_title: 'Coordenador de Qualidade', department: 'Qualidade' };
  const out = f.applyRealEnforcementToDashboard(user, {
    visible_modules: ['dashboard', 'settings', 'safety_intelligence', 'quality_intelligence', 'environment_intelligence'],
    profile_code: 'coordinator_quality'
  });
  const mods = out.response.visible_modules;
  assert(mods.includes('dashboard'), 'dashboard preserved');
  assert(mods.includes('quality_intelligence'), 'quality kept');
  assert(!mods.includes('safety_intelligence'), 'sst removed');
  assert(!mods.includes('environment_intelligence'), 'environmental removed');
}

function testRollbackReadiness() {
  console.log('\n=== Rollback readiness ===');
  reset();
  const s = loadFresh('../../src/realTenantEnforcement/realTenantEnforcementSupervisor');
  const r = s.superviseRealTenantEnforcement('z13-rb', {}, {});
  assert(r.rollback != null, 'rollback block');
}

function main() {
  console.log('Real Tenant Enforcement — Phase Z.13');
  testActivationRequiresExecute();
  testRealEnforcementQualityMenu();
  testRollbackReadiness();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main();
