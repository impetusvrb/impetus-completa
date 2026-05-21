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
  console.log('Summary Blindness — Phase Z.8');
  process.env.IMPETUS_SUMMARY_CONVERGENCE_OBSERVABILITY = 'on';
  const b = loadFresh('../../src/summaryBlindness/summaryBlindnessFacade');
  const vague = b.detectSummaryBlindness({ summary: 'Talvez haja risco, em análise.' }, { hierarchy_tier: 'coordination' });
  assert(vague.ambiguity.ambiguous === true, 'ambiguity detected');
  const weak = b.detectSummaryBlindness(
    {
      summary:
        'Resumo genérico do dia sem detalhes operacionais específicos para a linha ou equipa neste turno.'
    },
    { hierarchy_tier: 'operational' }
  );
  assert(weak.weak_guidance.weak === true, 'weak guidance');
  assert(weak.narrative_censored === false, 'no censorship');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
