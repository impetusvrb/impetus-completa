'use strict';

/**
 * npm run test:controlled-runtime-activation
 */

const path = require('path');
const fs = require('fs');

const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');
let passed = 0;
let failed = 0;

function assert(c, m, d) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
    if (d) console.log('       ', JSON.stringify(d).slice(0, 400));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function resetPhaseS() {
  delete process.env.IMPETUS_CONTROLLED_RUNTIME_ACTIVATION;
  delete process.env.IMPETUS_PRODUCTION_CHANNEL_GOVERNANCE;
  delete process.env.IMPETUS_RUNTIME_DELIVERY_VALIDATION;
  delete process.env.IMPETUS_RUNTIME_STABILIZATION_MONITOR;
  process.env.IMPETUS_CONTROLLED_ACTIVATION_OBSERVABILITY = 'on';
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/controlledActivation/')) delete require.cache[key];
  }
  loadFresh('../../src/controlledActivation/channelActivationGovernance').resetChannelActivation();
  loadFresh('../../src/controlledActivation/tenantRuntimeIsolation').clearTenantState();
  loadFresh('../../src/controlledActivation/productionActivationTelemetry').resetActivationTelemetry();
}

function testChannelOrder() {
  console.log('\n=== Channel activation order ===');
  resetPhaseS();
  const gov = loadFresh('../../src/controlledActivation/channelActivationGovernance');
  const act = loadFresh('../../src/controlledActivation/governedChannelActivation');
  assert(gov.getChannelOrder().join(',') === 'kpi,summary,chat,boundary', 'order KPI→boundary');
  const bad = act.governChannelActivation('chat', { readiness_ok: true, stability_ok: true });
  assert(bad.allowed === false && bad.reason === 'out_of_order', 'blocks chat before kpi');
  const prep = act.governChannelActivation('kpi', { readiness_ok: true, stability_ok: true });
  assert(prep.prepared === true && prep.auto_executed === false, 'kpi prepare without execute');
  const done = act.governChannelActivation('kpi', {
    execute: true,
    approved_by: 'ops@test',
    readiness_ok: true,
    stability_ok: true
  });
  assert(done.activated === true, 'kpi activated with approval');
  assert(gov.getNextExpectedChannel() === 'summary', 'next is summary');
}

function testTenantSafeRollout() {
  console.log('\n=== Tenant-safe rollout ===');
  resetPhaseS();
  const tenant = loadFresh('../../src/controlledActivation/tenantSafeActivation');
  const iso = loadFresh('../../src/controlledActivation/tenantRuntimeIsolation');
  const r1 = tenant.activateChannelForTenant('tenant-a', 'kpi', {
    execute: true,
    approved_by: 'admin',
    readiness_ok: true,
    stability_ok: true
  });
  assert(r1.tenant?.channels?.includes('kpi'), 'tenant-a kpi');
  const stateA = iso.getTenantState('tenant-a');
  const stateB = iso.getTenantState('tenant-b');
  assert(!stateB.channels.includes('kpi'), 'tenant-b isolated until activated');
  assert(stateA !== stateB, 'distinct tenant objects');
  assert(r1.protection?.cross_tenant_activation_blocked === true, 'cross-tenant block flag');
}

function testHierarchyDelivery() {
  console.log('\n=== Hierarchy delivery validation ===');
  resetPhaseS();
  const val = loadFresh('../../src/controlledActivation/hierarchyDeliveryValidator');
  const ok = val.validateHierarchyDelivery(
    { functional_axis: 'quality' },
    { hierarchy_integrity: 0.92, contextual_delivery: { hierarchy: { denied_hierarchy: [] } } }
  );
  assert(ok.valid === true, 'hierarchy valid');
  const bad = val.validateHierarchyDelivery(
    {},
    { hierarchy_integrity: 0.5, contextual_delivery: { hierarchy: { denied_hierarchy: ['x'] } } }
  );
  assert(bad.valid === false && bad.denied_count === 1, 'hierarchy denied');
}

function testContextualDeliveryAccuracy() {
  console.log('\n=== Contextual delivery accuracy ===');
  resetPhaseS();
  const val = loadFresh('../../src/controlledActivation/contextualDeliveryValidator');
  const good = val.validateContextualDelivery(
    { functional_axis: 'safety' },
    { visible_modules: ['mod1'], module_targeting_precision: 0.91 }
  );
  assert(good.contextual_delivery_accuracy >= 0.9, 'high accuracy');
  const low = val.validateContextualDelivery(
    { functional_axis: 'general' },
    { module_targeting_precision: 0.55 }
  );
  assert(low.issues.length >= 1, 'issues on low precision');
}

function testRolloutStabilization() {
  console.log('\n=== Rollout stabilization ===');
  resetPhaseS();
  const eng = loadFresh('../../src/controlledActivation/activationStabilizationEngine');
  const clean = eng.detectActivationIssues({});
  assert(clean.activation_stability >= 0.9, 'stable when clean');
  const bad = eng.detectActivationIssues({ leakage_count: 2, hierarchy_mismatch: true });
  assert(bad.issues.length >= 2, 'detects leakage and hierarchy');
  assert(bad.shadow_only === true, 'stabilization shadow by default');
}

function testRollbackReadiness() {
  console.log('\n=== Activation rollback readiness ===');
  resetPhaseS();
  const gov = loadFresh('../../src/controlledActivation/channelActivationGovernance');
  const act = loadFresh('../../src/controlledActivation/governedChannelActivation');
  act.governChannelActivation('kpi', {
    execute: true,
    approved_by: 'ops',
    readiness_ok: true,
    stability_ok: true
  });
  const prep = act.governChannelDeactivation('kpi', {});
  assert(prep.prepared === true && prep.manual_env_off_required !== true, 'deactivate prepared');
  const done = act.governChannelDeactivation('kpi', { execute: true, approved_by: 'ops' });
  assert(done.deactivated === true, 'kpi deactivated');
  assert(!gov.getActivatedChannels().includes('kpi'), 'kpi removed from set');
}

function testRuntimeActivationHealth() {
  console.log('\n=== Runtime activation health ===');
  resetPhaseS();
  const health = loadFresh('../../src/controlledActivation/runtimeActivationHealth');
  const h = health.assessRuntimeActivationHealth({
    contextual_delivery_accuracy: 0.9,
    hierarchy_accuracy: 0.88,
    activation_stability: 0.91,
    runtime_activation_confidence: 0.87
  });
  assert(h.rollout_health >= 0.8, 'rollout health');
  const orch = loadFresh('../../src/controlledActivation/productionActivationOrchestrator');
  assert(orch.getProductionActivationStatus().global_auto_activation === false, 'no global auto');
}

function testModuleKpiSummaryTargeting() {
  console.log('\n=== Module / KPI / summary targeting ===');
  resetPhaseS();
  const coord = loadFresh('../../src/controlledActivation/runtimeActivationCoordinator');
  const r = coord.coordinateActivationReadiness(
    { functional_axis: 'quality', company_id: 1 },
    {
      visible_modules: ['quality-dashboard'],
      module_targeting_precision: 0.93,
      kpi_precision: 0.91,
      summary_precision: 0.9,
      contextual_delivery: { contextual_delivery_confidence: 0.88, hierarchy: { denied_hierarchy: [] } },
      hierarchy_integrity: 0.9
    }
  );
  assert(r.readiness_ok === true, 'readiness ok');
  assert(r.delivery.contextual_delivery_accuracy >= 0.9, 'module delivery');
  const tele = loadFresh('../../src/controlledActivation/productionActivationTelemetry').getActivationTelemetry();
  assert(tele.KPI_delivery_accuracy >= 0.88, 'KPI telemetry');
  assert(tele.summary_delivery_accuracy >= 0.85, 'summary telemetry');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability (shadow) ===');
  resetPhaseS();
  const facade = loadFresh('../../src/controlledActivation/controlledActivationFacade');
  const { controlled_activation } = facade.enrichWithControlledActivation(
    { id: 1, company_id: 10, functional_axis: 'quality' },
    { visible_modules: ['q1'], functional_axis: 'quality' },
    { force: true }
  );
  assert(controlled_activation?.phase === 'S', 'phase S');
  assert(controlled_activation?.auto_activate === false, 'no auto activate');
  assert(controlled_activation?.global_activation === false, 'no global');
  assert(controlled_activation?.shadow_only === true, 'shadow when flag off');
}

function testFeatureFlagsDefaults() {
  console.log('\n=== Feature flags defaults ===');
  resetPhaseS();
  const flags = loadFresh('../../src/controlledActivation/config/phaseSFeatureFlags');
  assert(flags.isControlledRuntimeActivationEnabled() === false, 'runtime activation off');
  assert(flags.isControlledActivationObservabilityEnabled() === true, 'observability on');
}

function testProductionOrchestrator() {
  console.log('\n=== Production orchestrator ===');
  resetPhaseS();
  const orch = loadFresh('../../src/controlledActivation/productionActivationOrchestrator');
  const status = orch.getProductionActivationStatus({ tenant_id: 1 });
  assert(status.phase === 'S' && status.global_auto_activation === false, 'status shape');
  const ready = orch.assessEnterpriseReadiness({ functional_axis: 'safety', company_id: 1 }, { force: true });
  assert(ready.auto_activate === false, 'readiness no auto');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseS();
  const facade = loadFresh('../../src/controlledActivation/controlledActivationFacade');
  const personas = [
    ['executive', 'executive', 0.94],
    ['director', 'operations', 0.91],
    ['coordinator', 'safety', 0.88],
    ['supervisor', 'quality', 0.87],
    ['operator', 'operations', 0.85],
    ['hr', 'hr', 0.86],
    ['quality', 'quality', 0.9],
    ['environmental', 'environmental', 0.87],
    ['safety', 'safety', 0.89],
    ['financial', 'financial', 0.86]
  ];
  for (const [file, axis, precision] of personas) {
    const { controlled_activation } = facade.enrichWithControlledActivation(
      { id: 1, functional_axis: axis, company_id: 1 },
      { visible_modules: [`${axis}-mod`], functional_axis: axis },
      {
        force: true,
        precision_delivery: { modules: { module_targeting_precision: precision } },
        contextual_delivery: { contextual_delivery_confidence: precision, hierarchy: { denied_hierarchy: [] } },
        runtime_consistency: { cognitive_consistency_score: precision },
        decision_reliability: { runtime_decision_confidence: precision }
      }
    );
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(controlled_activation, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Controlled Runtime Activation — Phase S');
  testChannelOrder();
  testTenantSafeRollout();
  testHierarchyDelivery();
  testContextualDeliveryAccuracy();
  testRolloutStabilization();
  testRollbackReadiness();
  testRuntimeActivationHealth();
  testModuleKpiSummaryTargeting();
  testFacadeObservability();
  testFeatureFlagsDefaults();
  testProductionOrchestrator();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
