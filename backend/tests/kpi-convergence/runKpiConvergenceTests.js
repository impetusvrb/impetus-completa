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
  process.env.IMPETUS_KPI_CONVERGENCE_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/kpiConvergence/') || k.includes('/pilotTenants/') || k.includes('/contextualActivation/')) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant('conv-pilot', { approved_by: 'ops' });
  loadFresh('../../src/contextualActivation/tenantEnforcementState').setTenantEnforcementActive('conv-pilot', true, {
    approved_by: 'ops',
    channels: { menu: true, kpi: true }
  });
}

function main() {
  console.log('KPI Convergence — Phase Z.7');
  reset();
  const f = loadFresh('../../src/kpiConvergence/kpiConvergenceFacade');
  const execKpis = [
    { key: 'board_margin', domain: 'financial' },
    { key: 'strategic_index', domain: 'executive' }
  ];
  const r = f.applyKpiRuntimeConvergence(
    { company_id: 'conv-pilot' },
    execKpis,
    {
      force_convergence: true,
      hierarchy_tier: 'executive',
      domain_axis: 'executive'
    }
  );
  assert(r.kpi_runtime_convergence?.fabricated === false, 'no fabrication');
  assert(r.kpi_runtime_convergence?.convergence_score > 0, 'convergence score');
  assert(r.kpi_cockpit_integrity?.cockpit_useful !== false, 'cockpit useful');
  assert(r.kpi_governance_health?.health_score > 0, 'governance health');

  const opKpis = [
    { key: 'oee', domain: 'operations', operational: true },
    { key: 'line_throughput', domain: 'operations' }
  ];
  const op = loadFresh('../../src/kpiConvergence/executiveOperationalAlignment').assessExecutiveOperationalAlignment(
    opKpis,
    { hierarchy_tier: 'operational' }
  );
  assert(op.aligned === true, 'operator aligned');

  const coord = loadFresh('../../src/kpiConvergence/managerialVisibilityAssurance').assureManagerialVisibility(
    [{ key: 'k1', domain: 'hr' }, { key: 'k2', domain: 'operations' }],
    { hierarchy_tier: 'coordination' }
  );
  assert(coord.assured === true, 'coordination managerial');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
