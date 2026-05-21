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
  process.env.IMPETUS_RUNTIME_EXPANSION_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (
      k.includes('/governanceLoadProtection/') ||
      k.includes('/runtimeOperationalScaling/') ||
      k.includes('/pilotTenants/')
    ) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
}

function main() {
  console.log('Governance Load Protection — Phase Z.11');
  reset();
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant('z11-gov', { approved_by: 'ops' });

  const load = loadFresh('../../src/governanceLoadProtection/governanceLoadProtectionFacade');
  const high = load.assessGovernanceLoadProtection(
    'z11-gov',
    { consolidation: { pressure: { load: { governance_load: 0.85, overload: true } } } },
    { observability_layers: 14 }
  );
  assert(high.governance_overload_detected === true, 'governance overload detectado');
  assert(high.observability.observability_saturation_detected === true, 'observability saturation detectada');

  const entropy = loadFresh('../../src/governanceLoadProtection/runtimeEntropyProtection').detectRuntimeEntropy({
    scaling: { scaling_instability_detected: true },
    governance_load: { overload: true },
    observability: { saturated: true }
  });
  assert(entropy.runtime_entropy_detected === true, 'runtime entropy detectado');

  const facade = loadFresh('../../src/runtimeOperationalScaling/runtimeOperationalScalingFacade');
  const pack = facade.applyRuntimeOperationalScaling(
    { company_id: 'z11-gov' },
    { visible_modules: ['dashboard'] },
    { force_scaling: true }
  );
  assert(pack.governance_load_protection?.graceful_degradation === true, 'graceful degradation funcional');
  assert(pack.tenant_expansion_maturity?.cockpit_usefulness_preserved === true, 'cockpit usefulness preservado');
  assert(pack.response.visible_modules?.includes('dashboard'), 'payload legacy intacto');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
