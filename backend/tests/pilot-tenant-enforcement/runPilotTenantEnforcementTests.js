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
  process.env.IMPETUS_PILOT_TENANT_ENFORCEMENT = 'on';
  process.env.IMPETUS_MENU_RUNTIME_STABILIZATION = 'on';
  process.env.IMPETUS_UNDERDELIVERY_PROTECTION = 'on';
  process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION = 'on';
  process.env.IMPETUS_TENANT_CONTEXTUAL_ENFORCEMENT = 'on';
  process.env.IMPETUS_SAFE_MENU_ENFORCEMENT = 'on';
  process.env.IMPETUS_PILOT_RUNTIME_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (
      k.includes('/pilotTenants/') ||
      k.includes('/menuRuntimeStabilization/') ||
      k.includes('/underdeliveryProtection/') ||
      k.includes('/dashboardStabilization/') ||
      k.includes('/contextualActivation/')
    ) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
}

function testDashboardNeverEmpty() {
  console.log('\n=== Dashboard nunca vazio ===');
  reset();
  const g = loadFresh('../../src/menuRuntimeStabilization/dashboardSurvivalGuard');
  const r = g.guardDashboardSurvival([]);
  assert(r.visible_modules.includes('dashboard'), 'dashboard present');
}

function testMenuMinimumPreserved() {
  console.log('\n=== Menu mínimo preservado ===');
  reset();
  const p = loadFresh('../../src/menuRuntimeStabilization/gracefulMenuPreservation');
  const r = p.preserveGracefulMenu(['hr_intelligence'], {
    canonical_identity: { hierarchy_tier: 'coordination', domain_axis: 'hr' }
  });
  assert(r.minimum_operational === true, 'minimum ok');
}

function testRhLosesSstKeepsDashboard() {
  console.log('\n=== RH perde SST mantém dashboard ===');
  reset();
  const reg = loadFresh('../../src/pilotTenants/pilotTenantRegistry');
  reg.registerPilotTenant('pilot-hr', { approved_by: 'ops' });
  const pipe = loadFresh('../../src/pilotTenants/pilotMenuRuntimePipeline');
  const user = { company_id: 'pilot-hr', department: 'RH' };
  loadFresh('../../src/contextualActivation/tenantEnforcementState').setTenantEnforcementActive('pilot-hr', true, {
    approved_by: 'ops',
    channels: { menu: true }
  });
  const r = pipe.runPilotMenuRuntimePipeline(
    ['dashboard', 'settings', 'hr_intelligence', 'safety_intelligence', 'environment_intelligence'],
    user,
    { canonical_identity: { domain_axis: 'hr', hierarchy_level: 3, hierarchy_tier: 'coordination' }, force_pilot_pipeline: true }
  );
  assert(r.visible_modules.includes('dashboard'), 'dashboard');
  assert(!r.visible_modules.includes('safety_intelligence'), 'no sst');
}

function testUnderdeliveryProtection() {
  console.log('\n=== Underdelivery protection ===');
  reset();
  const u = loadFresh('../../src/underdeliveryProtection/underdeliveryProtectionFacade');
  const r = u.protectAgainstUnderdelivery(['dashboard'], {
    canonical_identity: { hierarchy_tier: 'operational' },
    tenant_id: 't1'
  });
  assert(r.risk.underdelivery_risk === true, 'risk detected');
}

function testPilotActivationFlow() {
  console.log('\n=== Pilot menu activation flow ===');
  reset();
  const coord = loadFresh('../../src/pilotTenants/tenantMenuActivationCoordinator');
  const user = { company_id: 'pilot-flow', role: 'gerente', department: 'Recursos Humanos' };
  const r = coord.coordinatePilotMenuActivation('pilot-flow', user, {
    execute: true,
    approved_by: 'ops@test',
    force: true,
    visible_modules: ['dashboard', 'hr_intelligence', 'environment_intelligence']
  });
  assert(r.menu_only === true, 'menu only');
  assert(r.channels_blocked?.includes('dashboard'), 'dashboard channel blocked');
}

function testRollbackPreservesModules() {
  console.log('\n=== Rollback preserva módulos ===');
  reset();
  const rb = loadFresh('../../src/pilotTenants/tenantMenuRollbackCoordinator');
  const r = rb.rollbackPilotMenu('pilot-hr', {
    execute: true,
    approved_by: 'ops',
    visible_modules_before: ['dashboard', 'hr_intelligence', 'extra']
  });
  assert(r.visible_modules_restored.length === 3, 'restored snapshot');
}

function testEmptyDashboardProtection() {
  console.log('\n=== Empty dashboard protection ===');
  reset();
  const e = loadFresh('../../src/dashboardStabilization/emptyDashboardProtection');
  const r = e.protectEmptyDashboard({ kpis: [], sections: [] });
  assert(r.frontend_safe === true, 'frontend safe');
}

function main() {
  console.log('Pilot Tenant Enforcement — Phase Z.3');
  testDashboardNeverEmpty();
  testMenuMinimumPreserved();
  testRhLosesSstKeepsDashboard();
  testUnderdeliveryProtection();
  testPilotActivationFlow();
  testRollbackPreservesModules();
  testEmptyDashboardProtection();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
