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
  process.env.IMPETUS_RUNTIME_CONSOLIDATION_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (
      k.includes('/tenantGovernanceMaturity/') ||
      k.includes('/tenantRuntimeStability/') ||
      k.includes('/runtimeGovernanceConsolidation/') ||
      k.includes('/pilotTenants/') ||
      k.includes('/contextualActivation/')
    ) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
  loadFresh('../../src/summaryRuntimeActivation/summaryRuntimeState').clearSummaryRuntimeState();
}

function main() {
  console.log('Tenant Governance Maturity — Phase Z.10');
  reset();
  const registry = loadFresh('../../src/pilotTenants/pilotTenantRegistry');
  const state = loadFresh('../../src/contextualActivation/tenantEnforcementState');
  registry.registerPilotTenant('z10-pilot', { approved_by: 'ops' });
  state.setTenantEnforcementActive('z10-pilot', true, {
    approved_by: 'ops',
    channels: { menu: true, kpi: true, summary: true }
  });

  const maturity = loadFresh('../../src/tenantGovernanceMaturity/tenantMaturityFacade').assessTenantGovernanceMaturity(
    'z10-pilot',
    { company_id: 'z10-pilot' },
    { force: true }
  );
  assert(maturity.maturity_score > 0, 'tenant maturity calculada');
  assert(maturity.auto_remediate === false, 'sem auto remediation');
  assert(maturity.chat_enforcement === false, 'chat off');

  const stability = loadFresh('../../src/tenantRuntimeStability/tenantStabilityFacade').assessTenantRuntimeStability(
    'z10-pilot',
    { kpi_runtime_stability: { oscillation: { detected: true } } }
  );
  assert(stability.oscillation.oscillating === true, 'rollout instability detectada');

  const pressure = loadFresh('../../src/governancePressure/governancePressureFacade').assessGovernancePressure(
    'z10-pilot',
    stability,
    { observability_layers: 10 }
  );
  assert(pressure.governance_fatigue_detected === true || pressure.load.overload === true, 'governance fatigue detectada');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
