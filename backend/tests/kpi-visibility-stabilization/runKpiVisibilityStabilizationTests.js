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
  console.log('KPI Visibility Stabilization — Phase Z.6');
  process.env.IMPETUS_KPI_RUNTIME_STABILITY_OBSERVABILITY = 'on';
  const det = loadFresh('../../src/kpiVisibilityStabilization/kpiVisibilityOscillationDetector');
  const r = det.detectKpiVisibilityOscillation(
    [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }],
    [{ key: 'a' }],
    {}
  );
  assert(r.oscillation_detected === true, 'oscillation detected');
  assert(r.delta >= 3, 'visibility delta');
  const vis = loadFresh('../../src/kpiVisibilityStabilization/kpiVisibilityStabilizationFacade');
  const s = vis.stabilizeKpiVisibility({}, [{ key: 'k1' }], { kpis_before: [{ key: 'k1' }, { key: 'k2' }] });
  assert(s.fabricated === false, 'no fabrication');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
