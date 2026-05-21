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
  process.env.IMPETUS_KPI_RUNTIME_ENFORCEMENT = 'on';
  process.env.IMPETUS_TENANT_KPI_ENFORCEMENT = 'on';
  process.env.IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION = 'on';
  process.env.IMPETUS_PILOT_TENANT_ENFORCEMENT = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/realKpiTargeting/') || k.includes('/kpiRuntimeEnforcement/') || k.includes('/pilotTenants/') || k.includes('/contextualActivation/')) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
}

function testShadowWhenInactive() {
  console.log('\n=== Shadow quando inactivo ===');
  reset();
  const f = loadFresh('../../src/realKpiTargeting/realKpiTargetingFacade');
  const r = f.applyRealKpiTargeting({ company_id: 'no-pilot' }, [{ id: 'oee' }], {});
  assert(r.shadow_only === true, 'shadow');
  assert(r.fabricated === false, 'no fabricate');
}

function testBlindnessProtection() {
  console.log('\n=== Protecção blindness ===');
  reset();
  const p = loadFresh('../../src/realKpiTargeting/operationalBlindnessProtection');
  const before = [{ id: 'open_tasks' }, { id: 'alerts' }];
  const r = p.protectOperationalKpiBlindness([], before, { canonical_identity: { hierarchy_tier: 'coordination' } });
  assert(r.blindness_protected && r.kpis.length > 0, 'restore minimum');
}

function main() {
  console.log('Real KPI Targeting — Phase Z.13');
  testShadowWhenInactive();
  testBlindnessProtection();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main();
