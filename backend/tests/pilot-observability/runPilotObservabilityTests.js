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
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/pilotTenants/') || k.includes('/pilotObservability/') || k.includes('/targetingConvergence/')) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant('obs-pilot', { approved_by: 'ops' });
}

function main() {
  console.log('Pilot Observability — Phase Z.4');
  reset();
  const obs = loadFresh('../../src/pilotObservability/pilotObservabilityFacade');
  const targeting = loadFresh('../../src/targetingConvergence/tenantTargetingConvergence');
  const conv = targeting.assessTenantTargetingConvergence('obs-pilot', {}, {
    canonical_identity: { domain_axis: 'hr', hierarchy_tier: 'coordination', hierarchy_level: 3 },
    visible_modules: ['dashboard', 'hr_intelligence']
  });
  assert(conv.recommendation_only === true, 'targeting recommendation only');
  const report = obs.getPilotObservabilityReport({ company_id: 'obs-pilot' }, { force: true, targeting: conv });
  assert(report.pilot === true, 'pilot report');
  assert(report.degradation_safe !== false, 'degradation safe');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
