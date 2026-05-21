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
  delete process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION;
  delete process.env.IMPETUS_TENANT_CONTEXTUAL_ENFORCEMENT;
  delete process.env.IMPETUS_SAFE_MENU_ENFORCEMENT;
  process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/contextualActivation/') || k.includes('/contextualEnforcement/') || k.includes('/tenantProfiling/')) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
}

function testExecuteRequired() {
  console.log('\n=== execute + approved_by ===');
  reset();
  process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION = 'on';
  process.env.IMPETUS_TENANT_CONTEXTUAL_ENFORCEMENT = 'on';
  const sup = loadFresh('../../src/contextualActivation/tenantContextualEnforcementSupervisor');
  const r = sup.activateTenantEnforcement('t1', { company_id: 't1', department: 'RH' }, { approved_by: 'ops' });
  assert(r.activated === false && r.prepared === true, 'needs execute');
}

function testActivateMenuChannel() {
  console.log('\n=== Activar menu tenant ===');
  reset();
  process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION = 'on';
  process.env.IMPETUS_TENANT_CONTEXTUAL_ENFORCEMENT = 'on';
  process.env.IMPETUS_SAFE_MENU_ENFORCEMENT = 'on';
  const sup = loadFresh('../../src/contextualActivation/tenantContextualEnforcementSupervisor');
  const user = { company_id: 't-hr', role: 'gerente', department: 'Recursos Humanos' };
  const r = sup.activateTenantEnforcement('t-hr', user, {
    execute: true,
    approved_by: 'ops@test',
    channel: 'menu',
    force_activation: true,
    visible_modules: ['dashboard', 'hr_intelligence', 'environment_intelligence']
  });
  assert(r.activated === true, 'activated');
  const menu = loadFresh('../../src/contextualActivation/safeMenuVisibilityRuntime');
  const vis = menu.applySafeMenuVisibility(
    ['dashboard', 'hr_intelligence', 'environment_intelligence', 'safety_intelligence'],
    user,
    { canonical_identity: { domain_axis: 'hr', hierarchy_level: 3 } }
  );
  assert(vis.enforcement_applied === true, 'menu enforced');
  assert(!vis.visible_modules.includes('environment_intelligence'), 'emissions pruned');
  assert(!vis.visible_modules.includes('safety_intelligence'), 'sst pruned');
}

function testIncompleteTenantBlocked() {
  console.log('\n=== Tenant incompleto bloqueado ===');
  reset();
  process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION = 'on';
  const sup = loadFresh('../../src/contextualActivation/tenantContextualEnforcementSupervisor');
  const r = sup.activateTenantEnforcement(
    't-bad',
    { company_id: 't-bad' },
    { execute: true, approved_by: 'x', channel: 'menu' }
  );
  assert(r.activated === false, 'blocked');
}

function testPruningNoPermanentRemove() {
  console.log('\n=== Sem remoção permanente ===');
  reset();
  const prune = loadFresh('../../src/contextualActivation/governedMenuPruningRuntime');
  const r = prune.applyGovernedMenuPruning(['dashboard', 'environment_intelligence'], {
    domain_axis: 'hr',
    hierarchy_level: 3
  });
  assert(r.permanent_remove === false, 'no permanent');
  assert(r.graceful_degradation === true, 'graceful');
}

function testRollbackReady() {
  console.log('\n=== Rollback readiness ===');
  reset();
  const rb = loadFresh('../../src/contextualActivation/tenantEnforcementRollbackReadiness');
  const r = rb.assessTenantEnforcementRollbackReadiness('t1');
  assert(r.auto_rollback === false, 'no auto rollback');
}

function testFacadeNoEnforcementWhenOff() {
  console.log('\n=== Flags off — sem alterar módulos ===');
  reset();
  const f = loadFresh('../../src/contextualActivation/contextualActivationFacade');
  const legacy = { visible_modules: ['dashboard', 'environment_intelligence'], profile_code: 'hr_management' };
  const r = f.enrichDashboardWithContextualEnforcement({ company_id: 't1' }, legacy, {});
  assert(r.response.visible_modules.length === 2, 'unchanged');
}

function main() {
  console.log('Contextual Activation — Phase Z.2');
  testExecuteRequired();
  testActivateMenuChannel();
  testIncompleteTenantBlocked();
  testPruningNoPermanentRemove();
  testRollbackReady();
  testFacadeNoEnforcementWhenOff();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
