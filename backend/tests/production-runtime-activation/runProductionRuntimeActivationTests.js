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
      k.includes('/productionRuntimeActivation/') ||
      k.includes('/productionRuntimeStabilization/') ||
      k.includes('/runtimeActivationSafety/') ||
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
  console.log('Production Runtime Activation — Phase Z.12');
  reset();
  const registry = loadFresh('../../src/pilotTenants/pilotTenantRegistry');
  const state = loadFresh('../../src/contextualActivation/tenantEnforcementState');
  registry.registerPilotTenant('z12-pilot', { approved_by: 'ops' });
  state.setTenantEnforcementActive('z12-pilot', true, {
    approved_by: 'ops',
    channels: { menu: true, kpi: true, summary: false }
  });

  const coord = loadFresh('../../src/productionRuntimeActivation/tenantPilotActivationCoordinator');
  const noExec = coord.coordinatePilotProductionActivation('z12-pilot', {}, {});
  assert(noExec.activated === false, 'sem execute nao activa');

  const deploy = loadFresh('../../src/productionRuntimeActivation/deploySafetyValidator');
  const pm2 = deploy.validatePm2ReloadReadiness();
  assert(pm2.brutal_restart_forbidden === true, 'restart bruto proibido');
  assert(pm2.auto_reload_forbidden === true, 'auto reload proibido');

  const facade = loadFresh('../../src/productionRuntimeActivation/productionRuntimeActivationFacade');
  const pack = facade.applyProductionRuntimeActivation(
    { company_id: 'z12-pilot' },
    { visible_modules: ['dashboard'] },
    { force_production: true }
  );
  assert(pack.production_runtime_activation?.auto_activation === false, 'sem auto activation');
  assert(pack.production_runtime_activation?.chat_enforcement === false, 'chat off');
  assert(pack.response.visible_modules?.includes('dashboard'), 'payload legacy intacto');

  const safety = loadFresh('../../src/runtimeActivationSafety/activationSafetyFacade').assessActivationSafety(
    'z12-pilot',
    {},
    { summary: { summary: 'Prioridade operacional: verificar linha 3 no turno.' }, force: true }
  );
  assert(safety.kpi.kpi_safe === true, 'KPI activation safety');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
