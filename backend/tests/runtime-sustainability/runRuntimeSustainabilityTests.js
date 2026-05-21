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
  console.log('Runtime Sustainability — Phase Z.10');
  const maturity = { maturity_score: 0.72 };
  const stability = { stability_score: 0.68, unstable: false, pressure: { overload: false } };
  const sust = loadFresh('../../src/runtimeSustainability/runtimeSustainabilityFacade').assessRuntimeSustainability(
    'z10-pilot',
    { maturity, stability },
    { kpi_governance_health: { health_score: 0.7 }, summary_governance_health: { health_score: 0.65 } }
  );
  assert(sust.sustainability_score > 0, 'runtime sustainability detectada');
  assert(sust.convergence.preserved === true, 'convergence sustainability preservada');
  assert(sust.auto_expand === false, 'sem auto expand');

  const conv = loadFresh('../../src/runtimeSustainability/convergenceSustainability').assessConvergenceSustainability({
    kpi_governance_health: { health_score: 0.6 },
    summary_governance_health: { health_score: 0.55 }
  });
  assert(conv.convergence_sustainability_score >= 0.55, 'convergence score');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
