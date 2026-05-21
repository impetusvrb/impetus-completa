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

function testDomainLeakageQuality() {
  console.log('\n=== Leakage domínio qualidade ===');
  const d = loadFresh('../../src/operationalLeakage/domainLeakageDetection');
  const r = d.detectDomainLeakage(
    ['dashboard', 'safety_intelligence', 'quality_intelligence'],
    { domain_axis: 'quality', hierarchy_level: 3 }
  );
  assert(r.count > 0, 'leaks found');
  assert(r.leaks.some((l) => l.module === 'safety_intelligence'), 'sst leak');
}

function testNoAutoRemediate() {
  console.log('\n=== Sem auto-remediação ===');
  const f = loadFresh('../../src/operationalLeakage/operationalLeakageFacade');
  const r = f.analyzeOperationalLeakageReport(
    { company_id: 't-leak', job_title: 'Coordenador de Qualidade' },
    { visible_modules: ['dashboard', 'safety_intelligence'], canonical_identity: { domain_axis: 'quality', hierarchy_level: 3 } }
  );
  assert(r.auto_remediate === false, 'no auto remediate');
  assert(r.observability_first === true, 'observability');
}

function main() {
  console.log('Operational Leakage — Phase Z.13');
  testDomainLeakageQuality();
  testNoAutoRemediate();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main();
