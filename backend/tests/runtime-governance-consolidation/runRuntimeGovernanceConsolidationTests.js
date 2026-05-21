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
      k.includes('/runtimeGovernanceConsolidation/') ||
      k.includes('/runtimeOperationalUsefulness/') ||
      k.includes('/tenantExpansionReadiness/') ||
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
  console.log('Runtime Governance Consolidation — Phase Z.10');
  reset();
  const registry = loadFresh('../../src/pilotTenants/pilotTenantRegistry');
  const state = loadFresh('../../src/contextualActivation/tenantEnforcementState');
  registry.registerPilotTenant('z10-cons', {
    approved_by: 'ops',
    summary_snapshot: { summary: 'Snapshot operacional preservado para rollback.' }
  });
  state.setTenantEnforcementActive('z10-cons', true, {
    approved_by: 'ops',
    channels: { menu: true, kpi: true, summary: false }
  });

  const facade = loadFresh('../../src/runtimeGovernanceConsolidation/runtimeGovernanceConsolidationFacade');
  const pack = facade.applyTenantRuntimeConsolidation(
    { company_id: 'z10-cons' },
    { visible_modules: ['dashboard', 'settings'] },
    { force_consolidation: true }
  );

  assert(pack.tenant_governance_maturity != null, 'maturity block');
  assert(pack.runtime_sustainability != null, 'sustainability block');
  assert(pack.runtime_operational_usefulness != null, 'usefulness block');
  assert(pack.runtime_operational_usefulness.cockpit_usefulness_preserved === true, 'cockpit usefulness preservado');
  assert(pack.consolidation.graceful_degradation === true, 'graceful degradation funcional');
  assert(pack.consolidation.auto_remediate === false, 'sem auto remediation');
  assert(pack.consolidation.rollback_readiness != null, 'rollback readiness preservado');
  assert(pack.response.visible_modules?.includes('dashboard'), 'payload legacy intacto');

  const expansion = pack.consolidation.expansion;
  assert(expansion.auto_expand === false, 'sem auto expand');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
