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
  console.log('Summary Delivery Quality — Phase Z.9');
  const quality = loadFresh('../../src/summaryDeliveryQuality/summaryDeliveryQualityFacade');
  const cockpit = loadFresh('../../src/summaryCockpitConsistency/summaryCockpitFacade');

  const good = quality.assessSummaryDeliveryQuality(
    { summary: 'Prioridade operacional: verificar linha 3 e executar checklist de manutenção no turno.' },
    { hierarchy_tier: 'operational' }
  );
  assert(good.usefulness.actionable === true, 'utilidade narrativa');
  assert(good.narrative_fabricated === false, 'sem fabricação quality');

  const weak = quality.assessSummaryDeliveryQuality({ summary: 'situação geral.' }, {});
  assert(weak.weak_guidance.weak_guidance === true, 'weak guidance detectado');

  const align = cockpit.assessSummaryCockpitIntegrity(
    { summary: 'margem consolidada no trimestre' },
    { kpis: [{ key: 'board_margin', title: 'margem' }] }
  );
  assert(align.cockpit.cockpit_aligned === true, 'cockpit consistency preservada');

  const converge = loadFresh('../../src/summaryConvergence/summaryKpiAlignmentRuntime').alignSummaryWithKpis(
    { summary: 'margem consolidada' },
    [{ key: 'board_margin', title: 'margem' }],
    {}
  );
  assert(converge.coherent === true, 'summary converge com KPI');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
