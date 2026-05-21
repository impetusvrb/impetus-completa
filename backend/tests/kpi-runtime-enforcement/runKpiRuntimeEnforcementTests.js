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
  process.env.IMPETUS_KPI_RUNTIME_ENFORCEMENT = 'on';
  process.env.IMPETUS_TENANT_KPI_ENFORCEMENT = 'on';
  process.env.IMPETUS_KPI_PILOT_OBSERVABILITY = 'on';
  process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION = 'on';
  process.env.IMPETUS_TENANT_CONTEXTUAL_ENFORCEMENT = 'on';
  for (const k of Object.keys(require.cache)) {
    if (
      k.includes('/kpiRuntimeEnforcement/') ||
      k.includes('/pilotTenants/') ||
      k.includes('/contextualActivation/')
    ) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant('kpi-pilot', { approved_by: 'ops' });
  loadFresh('../../src/contextualActivation/tenantEnforcementState').setTenantEnforcementActive('kpi-pilot', true, {
    approved_by: 'ops',
    channels: { menu: true, kpi: true }
  });
}

function testRhLosesSstKpi() {
  console.log('\n=== RH perde KPI SST ===');
  reset();
  const rt = loadFresh('../../src/kpiRuntimeEnforcement/tenantKpiEnforcementRuntime');
  const kpis = [
    { key: 'hr_turnover', domain: 'hr' },
    { key: 'sst_incidents', domain: 'safety' },
    { key: 'ops_oee', domain: 'operations' }
  ];
  const r = rt.runTenantKpiEnforcementRuntime(
    kpis,
    { company_id: 'kpi-pilot', department: 'RH' },
    {
      force_kpi_pipeline: true,
      domain_axis: 'hr',
      hierarchy_tier: 'coordination'
    }
  );
  const keys = r.kpis.map((k) => String(k.key).toLowerCase());
  assert(!keys.includes('sst_incidents'), 'sst removed');
  assert(keys.includes('hr_turnover'), 'hr kept');
}

function testExecutiveMinimum() {
  console.log('\n=== Executivo mantém estratégicos ===');
  reset();
  const grace = loadFresh('../../src/kpiGracefulPreservation/executiveStrategicKpiPreservation');
  const r = grace.preserveExecutiveStrategicKpis(
    [{ key: 'ops_only', domain: 'operations' }],
    [{ key: 'board_margin', domain: 'financial' }, { key: 'ops_only', domain: 'operations' }],
    { hierarchy_tier: 'executive' }
  );
  assert(r.kpis.some((k) => k.key === 'board_margin'), 'financial preserved');
}

function testRollback() {
  console.log('\n=== Rollback restaura KPIs ===');
  reset();
  const rb = loadFresh('../../src/kpiRuntimeEnforcement/tenantKpiRollbackCoordinator');
  const before = [{ key: 'a' }, { key: 'b' }];
  const r = rb.rollbackTenantKpi('kpi-pilot', {
    execute: true,
    approved_by: 'ops',
    kpis_before: before
  });
  assert(r.kpis_restored.length === 2, 'snapshot restored');
}

function testDashboardNotEmpty() {
  console.log('\n=== Dashboard preservado ===');
  reset();
  const guard = loadFresh('../../src/kpiGracefulPreservation/dashboardKpiIntegrityGuard');
  const r = guard.guardDashboardKpiIntegrity([{ key: 'x' }]);
  assert(r.frontend_safe === true, 'not empty');
}

function testActivationFlow() {
  console.log('\n=== Activation flow ===');
  reset();
  const act = loadFresh('../../src/kpiRuntimeEnforcement/tenantKpiActivationCoordinator');
  const r = act.coordinateTenantKpiActivation(
    'kpi-pilot',
    { company_id: 'kpi-pilot', department: 'RH', role: 'gerente' },
    { execute: true, approved_by: 'ops@test', force: true, kpis_before: [{ key: 'k1' }] }
  );
  assert(r.kpi_only === true, 'kpi only');
  assert(r.channels_blocked?.includes('summary'), 'summary blocked');
}

function main() {
  console.log('KPI Runtime Enforcement — Phase Z.5');
  testRhLosesSstKpi();
  testExecutiveMinimum();
  testRollback();
  testDashboardNotEmpty();
  testActivationFlow();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
