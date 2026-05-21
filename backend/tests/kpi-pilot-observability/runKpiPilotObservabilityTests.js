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
  process.env.IMPETUS_KPI_PILOT_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/pilotTenants/') || k.includes('/kpiPilotObservability/')) delete require.cache[k];
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant('obs-kpi', { approved_by: 'ops' });
}

function main() {
  console.log('KPI Pilot Observability — Phase Z.5');
  reset();
  const obs = loadFresh('../../src/kpiPilotObservability/kpiPilotObservabilityFacade');
  const r = obs.getKpiPilotObservabilityReport(
    { company_id: 'obs-kpi' },
    {
      force: true,
      pipeline: {
        enforcement_applied: true,
        before_count: 5,
        after_count: 3,
        integrity: { frontend_safe: true },
        before: [{ key: 'a' }]
      },
      safety: { leakage: { leakage_detected: true } }
    }
  );
  assert(r.pilot === true, 'pilot report');
  assert(r.rollback?.restore_from_snapshot === true, 'rollback ready');
  assert(r.enforcement_health?.fabricated === false, 'no fabrication');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
