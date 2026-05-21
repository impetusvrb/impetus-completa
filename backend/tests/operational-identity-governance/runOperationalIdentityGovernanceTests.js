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
  process.env.IMPETUS_OPERATIONAL_IDENTITY_GOVERNANCE = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/operationalIdentityGovernance/') || k.includes('/operationalIdentity/')) {
      delete require.cache[k];
    }
  }
}

function testQualityCoordinatorMapping() {
  console.log('\n=== Coordenador Qualidade → quality ===');
  reset();
  const norm = loadFresh('../../src/operationalIdentityGovernance/organizationalRoleNormalizer');
  const r = norm.normalizeOrganizationalRole(
    { job_title: 'Coordenador de Qualidade', department: 'Qualidade' },
    {}
  );
  assert(r.matched && r.domain_axis === 'quality', 'quality domain');
  assert(r.hierarchy_tier === 'coordination', 'coordination tier');
}

function testGovernedIdentity() {
  console.log('\n=== Identidade governada ===');
  reset();
  const f = loadFresh('../../src/operationalIdentityGovernance/operationalIdentityGovernanceFacade');
  const pack = f.resolveGovernedIdentityForUser(
    { company_id: 't-q', job_title: 'Coordenador de Qualidade', department: 'Qualidade' },
    { profile_code: 'coordinator_quality' }
  );
  assert(pack.canonical_identity.domain_axis === 'quality', 'governed axis');
  assert(pack.auto_apply === false, 'no auto apply');
}

function testCrossDomainValidation() {
  console.log('\n=== Validação cross-domain ===');
  reset();
  const v = loadFresh('../../src/operationalIdentityGovernance/functionalIdentityValidator');
  const r = v.validateFunctionalIdentity(
    { domain_axis: 'quality', hierarchy_tier: 'coordination', hierarchy_level: 3 },
    ['dashboard', 'safety_intelligence', 'quality_intelligence']
  );
  assert(!r.valid && r.cross_domain.length > 0, 'sst leak detected');
}

function main() {
  console.log('Operational Identity Governance — Phase Z.13');
  testQualityCoordinatorMapping();
  testGovernedIdentity();
  testCrossDomainValidation();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main();
