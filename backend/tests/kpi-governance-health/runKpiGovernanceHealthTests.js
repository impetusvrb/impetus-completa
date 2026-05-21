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
  console.log('KPI Governance Health — Phase Z.7');
  const h = loadFresh('../../src/kpiGovernanceHealth/kpiGovernanceHealthFacade');
  const r = h.assessKpiGovernanceHealth({
    convergence: { convergence_score: 0.8, converged: true },
    blindness: { critical_blind_spot: false },
    quality: { usefulness: { operationally_useful: true } },
    cockpit: { cockpit_preserved: true }
  });
  assert(r.health_score >= 0.7, 'health score');
  assert(r.governance_integrity === true, 'integrity');
  assert(r.fabricated === false, 'no fabrication');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
