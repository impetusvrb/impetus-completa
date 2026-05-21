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

function testLeakageDetectionNoRewrite() {
  console.log('\n=== Leakage sem reescrita ===');
  const iso = loadFresh('../../src/realSummaryTargeting/narrativeDomainIsolation');
  const r = iso.isolateNarrativeByDomain(
    { summary: 'Verificar SST e APR no setor' },
    { canonical_identity: { domain_axis: 'quality' } }
  );
  assert(r.isolation_observed, 'leak hint');
  assert(r.rewrite_applied === false, 'no rewrite');
  assert(r.semantic_truth_preserved, 'truth preserved');
}

function testUnderdeliveryProtection() {
  console.log('\n=== Underdelivery summary ===');
  const u = loadFresh('../../src/realSummaryTargeting/summaryUnderdeliveryProtection');
  const before = { summary: 'Resumo operacional válido' };
  const r = u.protectSummaryUnderdelivery({}, before, {});
  assert(r.underdelivery_protected, 'restored');
}

function main() {
  console.log('Real Summary Targeting — Phase Z.13');
  testLeakageDetectionNoRewrite();
  testUnderdeliveryProtection();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main();
