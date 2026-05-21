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

function main() {
  console.log('Pilot Tenant Health — Phase Z.12');
  const health = loadFresh('../../src/pilotTenantHealth/pilotTenantHealthFacade');
  const result = health.assessPilotTenantHealth('z12-h', {
    force: true,
    z10: { tenant_governance_maturity: { maturity_score: 0.7 }, runtime_sustainability: { sustainability_score: 0.65 } },
    activation_safety: { activation_safe: true },
    stabilization: { operational_stable: true },
    usefulness: { usefulness: { operationally_useful: true } }
  });
  assert(result.health_score > 0, 'tenant health calculado');
  assert(result.graceful_degradation === true, 'graceful degradation');
  assert(result.auto_remediate === false, 'sem auto remediation');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
