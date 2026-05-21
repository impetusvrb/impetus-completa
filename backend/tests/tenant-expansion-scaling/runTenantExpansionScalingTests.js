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
      k.includes('/tenantExpansionScaling/') ||
      k.includes('/runtimeOperationalScaling/') ||
      k.includes('/runtimeGovernanceConsolidation/') ||
      k.includes('/pilotTenants/') ||
      k.includes('/contextualActivation/')
    ) {
      delete require.cache[k];
    }
  }
  loadFresh('../../src/pilotTenants/pilotTenantRegistry').clearPilotRegistry();
  loadFresh('../../src/contextualActivation/tenantEnforcementState').clearTenantEnforcementState();
}

function main() {
  console.log('Tenant Expansion Scaling — Phase Z.11');
  reset();
  const registry = loadFresh('../../src/pilotTenants/pilotTenantRegistry');
  const state = loadFresh('../../src/contextualActivation/tenantEnforcementState');
  registry.registerPilotTenant('z11-pilot', { approved_by: 'ops' });
  state.setTenantEnforcementActive('z11-pilot', true, {
    approved_by: 'ops',
    channels: { menu: true, kpi: true, summary: true }
  });

  const facade = loadFresh('../../src/tenantExpansionScaling/tenantExpansionFacade');
  const pack = facade.assessTenantExpansionScaling(
    'z11-pilot',
    {
      tenant_governance_maturity: { maturity_score: 0.75 },
      runtime_sustainability: { sustainability_score: 0.7 },
      consolidation: { stability: { unstable: false, pressure: { channel_pressure: 0.3 } } }
    },
    { force_scaling: true }
  );
  assert(pack.classification.classification != null, 'tenant maturity classificada');
  assert(pack.auto_expand === false, 'sem auto expand');

  const scaling = loadFresh('../../src/runtimeOperationalScaling/scalingStabilityFacade').assessScalingStability(
    'z11-pilot',
    {},
    { kpi_oscillation: true, summary_oscillation_events: 3 }
  );
  assert(scaling.scaling_instability_detected === true, 'scaling instability detectada');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
