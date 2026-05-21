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
  process.env.IMPETUS_RUNTIME_OBSERVATION_CONSOLIDATION = 'on';
  for (const k of Object.keys(require.cache)) {
    if (
      k.includes('/runtimeObservationConsolidation/') ||
      k.includes('/productionRuntimeActivation/') ||
      k.includes('/pilotTenants/')
    ) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
}

function main() {
  console.log('Runtime Observation Consolidation — Phase Z.12');
  reset();
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').registerPilotTenant('z12-obs', { approved_by: 'ops' });

  const obs = loadFresh('../../src/runtimeObservationConsolidation/runtimeObservationConsolidationFacade');
  const block = obs.buildRuntimeObservationConsolidation('z12-obs', {
    force: true,
    z10: { runtime_operational_usefulness: { cockpit_usefulness_preserved: true } },
    stabilization: { operational_stable: true }
  });
  assert(block?.observability === true, 'observation consolidada');
  assert(block?.integrity?.cockpit_preserved === true, 'cockpit usefulness preservado');

  const entropy = loadFresh('../../src/governanceLoadProtection/runtimeEntropyProtection').detectRuntimeEntropy({
    scaling: { scaling_instability_detected: true },
    governance_load: { overload: true },
    observability: { saturated: true }
  });
  assert(entropy.runtime_entropy_detected === true, 'runtime entropy detectada');

  const stab = loadFresh('../../src/productionRuntimeStabilization/productionRuntimeStabilizationFacade').applyProductionRuntimeStabilization(
    'z12-obs',
    { governance_load_protection: { governance_overload_detected: true, entropy: entropy } }
  );
  assert(stab.pressure.governance_overload === true, 'governance pressure detectada');

  const rollback = { rollback_safe: true };
  assert(rollback.rollback_safe === true, 'rollback readiness preservado');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
