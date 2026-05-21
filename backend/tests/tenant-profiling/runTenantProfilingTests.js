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

function testCompleteTenant() {
  console.log('\n=== Tenant completo ===');
  const r = loadFresh('../../src/tenantProfiling/tenantDeliveryReadiness').assessTenantDeliveryReadiness('t-ok', {
    tenant_id: 't-ok',
    domain_axis: 'hr',
    department: 'Recursos Humanos',
    hierarchy_level: 3,
    hierarchy_tier: 'coordination',
    role: 'coordenador',
    profile_code: 'hr_management',
    inference_complete: true,
    operational_scope: 'department'
  });
  assert(r.enforcement_ready === true, 'ready');
}

function testIncompleteDomain() {
  console.log('\n=== Sem domínio ===');
  const d = loadFresh('../../src/tenantProfiling/tenantDomainCompleteness').assessTenantDomainCompleteness({
    domain_axis: 'unknown'
  });
  assert(d.domain_complete === false, 'incomplete');
}

function main() {
  console.log('Tenant Profiling — Phase Z.1');
  testCompleteTenant();
  testIncompleteDomain();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
