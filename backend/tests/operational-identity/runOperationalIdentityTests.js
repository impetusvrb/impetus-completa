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
  process.env.IMPETUS_RUNTIME_OBSERVATION_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/operationalIdentity/') || k.includes('/phaseZ0/') || k.includes('/domainAuthority/')) {
      delete require.cache[k];
    }
  }
}

function testCanonicalIdentity() {
  console.log('\n=== Identidade canónica ===');
  reset();
  const r = loadFresh('../../src/operationalIdentity/canonicalOperationalIdentityResolver');
  const out = r.resolveCanonicalOperationalIdentity(
    { company_id: 't1', role: 'gerente', department: 'RH' },
    { profile_code: 'hr_management', functional_axis: 'hr', visible_modules: ['dashboard', 'hr_intelligence'] }
  );
  assert(out.canonical_identity.domain_axis === 'hr' || out.domain.domain_axis === 'hr', 'hr axis');
  assert(out.auto_apply === false, 'no apply');
}

function testExecutiveScope() {
  console.log('\n=== Executivo scope ===');
  reset();
  const h = loadFresh('../../src/operationalIdentity/hierarchyAuthorityResolver');
  const r = h.resolveHierarchyAuthority({ role: 'ceo' }, { profile_code: 'ceo_executive' });
  assert(r.hierarchy_tier === 'executive', 'executive tier');
}

function testOperatorNoStrategic() {
  console.log('\n=== Operador sem estratégico ===');
  reset();
  const rs = loadFresh('../../src/operationalIdentity/roleScopeResolver');
  const r = rs.resolveRoleScope(
    { role: 'operador', visible_modules: ['dashboard', 'audit'] },
    { hierarchy_tier: 'operational' },
    { domain_axis: 'production' }
  );
  assert(r.conflicts.some((c) => c.type === 'operator_admin_module'), 'conflict');
}

function main() {
  console.log('Operational Identity — Phase Z.0');
  testCanonicalIdentity();
  testExecutiveScope();
  testOperatorNoStrategic();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
