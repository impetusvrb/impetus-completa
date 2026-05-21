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
  process.env.IMPETUS_SUMMARY_RUNTIME_OBSERVABILITY = 'on';
  process.env.IMPETUS_SUMMARY_RUNTIME_ACTIVATION = 'off';
  process.env.IMPETUS_TENANT_SUMMARY_ENFORCEMENT = 'off';
  for (const k of Object.keys(require.cache)) {
    if (
      k.includes('/summaryRuntimeActivation/') ||
      k.includes('/summaryNarrativeStabilization/') ||
      k.includes('/summaryUnderdelivery/') ||
      k.includes('/summaryTargetingHardening/') ||
      k.includes('/summaryDeliveryQuality/') ||
      k.includes('/summaryCockpitConsistency/') ||
      k.includes('/summaryRuntimeObservability/') ||
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
  console.log('Summary Runtime Activation — Phase Z.9');
  reset();

  const registry = loadFresh('../../src/pilotTenants/pilotTenantRegistry');
  const state = loadFresh('../../src/contextualActivation/tenantEnforcementState');
  registry.registerPilotTenant('z9-pilot', {
    approved_by: 'ops',
    summary_snapshot: {
      summary: 'Visão estratégica: margem consolidada e prioridades do board para o trimestre.',
      text: 'Visão estratégica: margem consolidada e prioridades do board para o trimestre.'
    }
  });
  state.setTenantEnforcementActive('z9-pilot', true, {
    approved_by: 'ops',
    channels: { menu: true, kpi: true, summary: false }
  });

  const facade = loadFresh('../../src/summaryRuntimeActivation/summaryRuntimeActivationFacade');
  const shadow = facade.applySummaryRuntimeActivation(
    { company_id: 'z9-pilot' },
    { summary: 'Texto curto.' },
    { hierarchy_tier: 'executive', force_summary_activation: true }
  );
  assert(shadow.summary_runtime_activation?.narrative_fabricated === false, 'no fabrication shadow');
  assert(shadow.summary_runtime_activation?.enforcement_applied === false, 'enforcement off by default');

  process.env.IMPETUS_SUMMARY_RUNTIME_ACTIVATION = 'on';
  process.env.IMPETUS_TENANT_SUMMARY_ENFORCEMENT = 'on';
  process.env.IMPETUS_SUMMARY_TARGETING_HARDENING = 'on';
  delete require.cache[require.resolve('../../src/summaryRuntimeActivation/config/phaseZ9FeatureFlags')];
  state.setTenantEnforcementChannel('z9-pilot', 'summary', true);

  const leaky = {
    summary:
      'Checklist de manutenção na linha 3. Visão estratégica: margem consolidada e prioridades do board para o trimestre.'
  };
  const enforced = loadFresh('../../src/summaryRuntimeActivation/summaryRuntimeActivationFacade').applySummaryRuntimeActivation(
    { company_id: 'z9-pilot' },
    leaky,
    { hierarchy_tier: 'executive', force_summary_activation: true }
  );
  assert(enforced.summary_runtime_activation?.enforcement_applied === true, 'targeting enforcement applied');
  assert(
    !String(enforced.payload.summary || '').toLowerCase().includes('checklist de manutenção'),
    'narrative leakage removed'
  );

  const rollback = loadFresh('../../src/summaryRuntimeActivation/summaryActivationCoordinator').rollbackTenantSummary(
    'z9-pilot',
    { execute: true, approved_by: 'ops' }
  );
  assert(rollback.rolled_back === true, 'rollback preserves channel control');
  assert(rollback.narrative_fabricated === false, 'rollback no fabrication');

  const readiness = loadFresh('../../src/summaryRuntimeActivation/tenantSummaryReadinessValidator').validateTenantSummaryReadiness(
    'z9-pilot',
    {},
    { force: true }
  );
  assert(readiness.ready === true, 'readiness with force');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
