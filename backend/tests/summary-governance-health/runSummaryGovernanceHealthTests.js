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
  console.log('Summary Governance Health — Phase Z.8');
  const h = loadFresh('../../src/summaryGovernanceHealth/summaryGovernanceHealthFacade');
  const r = h.assessSummaryGovernanceHealth({
    convergence: { convergence_score: 0.78, converged: true },
    blindness: { critical_blind_spot: false },
    stability: { stable: true },
    assurance: { executive: { assured: true }, operational: { assured: true } },
    narrative_integrity: { integrity: 0.85 }
  });
  assert(r.health_score >= 0.65, 'health score');
  assert(r.governance_integrity === true, 'integrity');
  assert(r.narrative_fabricated === false, 'no fabrication');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
