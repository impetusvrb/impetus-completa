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
  process.env.IMPETUS_KPI_RUNTIME_STABILITY_OBSERVABILITY = 'on';
  process.env.IMPETUS_KPI_UNDERDELIVERY_HARDENING = 'on';
  process.env.IMPETUS_KPI_RUNTIME_ENFORCEMENT = 'on';
  process.env.IMPETUS_TENANT_KPI_ENFORCEMENT = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/kpiRuntimeStability/') || k.includes('/pilotTenants/') || k.includes('/contextualActivation/')) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant('stab-kpi', { approved_by: 'ops' });
  loadFresh('../../src/contextualActivation/tenantEnforcementState').setTenantEnforcementActive('stab-kpi', true, {
    approved_by: 'ops',
    channels: { menu: true, kpi: true }
  });
}

function main() {
  console.log('KPI Runtime Stability — Phase Z.6');
  reset();
  const f = loadFresh('../../src/kpiRuntimeStability/kpiRuntimeStabilityFacade');
  const kpis = [
    { key: 'hr_turnover', domain: 'hr' },
    { key: 'sst_incidents', domain: 'safety' }
  ];
  const r = f.applyKpiRuntimeStability(
    { company_id: 'stab-kpi', department: 'RH' },
    kpis,
    {
      force_stability: true,
      hierarchy_tier: 'coordination',
      domain_axis: 'hr',
      kpis_before: kpis
    }
  );
  assert(r.kpi_runtime_stability?.fabricated === false, 'no fabrication');
  assert(r.kpi_visibility_integrity != null, 'visibility integrity');
  assert(r.kpi_operational_quality != null, 'operational quality');
  const exec = loadFresh('../../src/kpiOperationalMinimums/executiveKpiMinimumsRuntime');
  const ex = exec.ensureExecutiveKpiMinimums(
    [],
    [{ key: 'board_margin', domain: 'financial' }],
    { hierarchy_tier: 'executive' }
  );
  assert(ex.kpis.length >= 1, 'executive minimum');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
