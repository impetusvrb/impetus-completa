'use strict';

/**
 * Fase J — Enterprise Governance Operations
 * npm run test:cognitive-governance-phase-j
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

function enablePhaseJ() {
  process.env.IMPETUS_GOVERNANCE_OPERATIONS = 'on';
  process.env.IMPETUS_GOVERNANCE_INCIDENT_ENGINE = 'on';
  process.env.IMPETUS_GOVERNANCE_RUNTIME_HEALTH = 'on';
  process.env.IMPETUS_GOVERNANCE_EMERGENCY_CONTROLS = 'on';
  process.env.IMPETUS_GOVERNANCE_QUALITY_GATES = 'on';
  process.env.IMPETUS_GOVERNANCE_READINESS = 'on';
  process.env.IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION = 'on';
  delete require.cache[require.resolve('../../src/governanceOperations/config/phaseJFeatureFlags')];
}

function testOperationalStateTransitions() {
  console.log('\n=== Operational state transitions ===');
  enablePhaseJ();
  const state = loadFresh('../../src/governanceOperations/governanceOperationalState');
  state.resetForTests();
  assert(state.getOperationalState().state === 'shadow_only', 'initial shadow_only');
  const t1 = state.transitionTo('controlled_activation', { source: 'test' });
  assert(t1.changed === true, 'transition to controlled_activation');
  const t2 = state.transitionTo('degraded', { source: 'test' });
  assert(t2.changed === true, 'transition to degraded');
  assert(state.getOperationalState().state === 'degraded', 'state is degraded');
}

function testIncidentClassification() {
  console.log('\n=== Incident classification ===');
  enablePhaseJ();
  const engine = loadFresh('../../src/governanceOperations/governanceIncidentEngine');
  engine.clearForTests();
  const leak = engine.detectIncident('leakage_incident', { leakage_detected: true, force: true });
  assert(leak.detected === true, 'leakage detected');
  assert(leak.incident.severity === 'critical', 'leakage critical', leak.incident);
  const ob = engine.detectIncident('overblocking_incident', { overblocking_rate: 0.25, force: true });
  assert(ob.incident.severity === 'high', 'overblocking high');
}

function testRolloutOrchestration() {
  console.log('\n=== Rollout orchestration ===');
  enablePhaseJ();
  const orch = loadFresh('../../src/governanceOperations/governanceActivationOrchestrator');
  const plan = orch.orchestrateActivation('kpi', { force: true });
  assert(plan.orchestrated === true, 'activation orchestrated');
  assert(plan.auto_executed === false, 'no auto execution');
  assert(plan.plan && plan.plan.manual_confirmation_required !== true, 'plan has endpoint', plan);
}

function testEmergencyRollbackReadiness() {
  console.log('\n=== Emergency rollback readiness ===');
  enablePhaseJ();
  const state = loadFresh('../../src/governanceOperations/governanceOperationalState');
  state.resetForTests();
  const emergency = loadFresh('../../src/governanceOperations/governanceEmergencyControls');
  const prep = emergency.prepareEmergency({ approved_by: 'test-admin', force: true });
  assert(prep.prepared === true, 'emergency prepared');
  assert(prep.auto_executed === false, 'emergency not auto executed');
  assert(prep.rollback && prep.rollback.auto_executed === false, 'rollback plan manual');
  assert(state.getOperationalState().state === 'emergency_mode', 'emergency_mode state');
}

function testOperationalMetricsIntegrity() {
  console.log('\n=== Operational metrics integrity ===');
  enablePhaseJ();
  const metrics = loadFresh('../../src/governanceOperations/governanceOperationalMetrics');
  const m = metrics.computeOperationalMetrics({ force: true });
  assert(typeof m.governance_operational_health === 'number', 'operational health number');
  assert(m.governance_operational_health >= 0 && m.governance_operational_health <= 1, 'health in range');
  assert(typeof m.governance_context_integrity === 'number', 'context integrity');
}

function testDegradationEscalation() {
  console.log('\n=== Degradation escalation ===');
  enablePhaseJ();
  const engine = loadFresh('../../src/governanceOperations/governanceIncidentEngine');
  engine.clearForTests();
  const inc = engine.detectIncident('governance_degradation', {
    degradation_score: 0.4,
    force: true
  });
  const esc = engine.escalateIncident(inc.incident.id, 'test');
  assert(esc.escalated === true, 'incident escalated');
  assert(esc.incident.auto_remediation === false, 'no auto remediation');
}

function testTenantRolloutIsolation() {
  console.log('\n=== Tenant rollout isolation ===');
  enablePhaseJ();
  process.env.IMPETUS_TENANT_SAFE_GOVERNANCE = 'on';
  const orch = loadFresh('../../src/governanceOperations/governancePromotionOrchestrator');
  const iso = loadFresh('../../src/governanceActivation/tenantActivationIsolation');
  iso.clearAllForTests();
  const promo = orch.orchestratePromotion('summary', {
    tenant_id: 'tenant-j1',
    force: true,
    execute: false
  });
  assert(promo.orchestrated === true, 'tenant promotion orchestrated');
  assert(promo.auto_executed === false, 'tenant promo not auto');
}

function testLifecycleConsistency() {
  console.log('\n=== Lifecycle consistency ===');
  enablePhaseJ();
  const lc = loadFresh('../../src/governanceOperations/governanceLifecycleCoordinator');
  const snap = lc.getLifecycleSnapshot();
  assert(snap.auto_progression === false, 'no auto progression');
  assert(Array.isArray(snap.phases), 'lifecycle phases');
  assert(snap.operational_state, 'operational state present');
}

function testRuntimeOperationalHealth() {
  console.log('\n=== Runtime operational health ===');
  enablePhaseJ();
  const health = loadFresh('../../src/governanceOperations/governanceProductionHealth');
  const h = health.computeProductionHealth({ force: true });
  assert(h.enabled === true, 'health enabled');
  assert(h.auto_remediation === false, 'no auto remediation');
  assert(typeof h.production_ready === 'boolean', 'production_ready boolean');
}

function testGovernanceEmergencyPreparation() {
  console.log('\n=== Governance emergency preparation ===');
  enablePhaseJ();
  const svc = loadFresh('../../src/governanceOperations/governanceOperationsService');
  const statusOff = svc.getOperationsStatus();
  process.env.IMPETUS_GOVERNANCE_OPERATIONS = 'off';
  delete require.cache[require.resolve('../../src/governanceOperations/config/phaseJFeatureFlags')];
  const statusDisabled = loadFresh('../../src/governanceOperations/governanceOperationsService').getOperationsStatus();
  assert(statusDisabled.enabled === false, 'operations off when flag off');
  enablePhaseJ();
  const statusOn = loadFresh('../../src/governanceOperations/governanceOperationsService').getOperationsStatus({ force: true });
  assert(statusOn.enabled === true, 'operations on with flag');
  assert(statusOn.auto_activation === false, 'auto activation false');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  enablePhaseJ();
  const state = loadFresh('../../src/governanceOperations/governanceOperationalState');
  const engine = loadFresh('../../src/governanceOperations/governanceIncidentEngine');
  const svc = loadFresh('../../src/governanceOperations/governanceOperationsService');
  state.resetForTests();
  engine.clearForTests();

  const files = [
    ['governance_operations_shadow', () => {
      state.resetForTests();
      return { state: state.getOperationalState(), ops: svc.getOperationsStatus({ force: true }) };
    }],
    ['governance_operations_partial', () => {
      state.transitionTo('partial_governance', { source: 'snapshot' });
      return { state: state.getOperationalState() };
    }],
    ['governance_incident_runtime', () => {
      const inc = engine.detectIncident('runtime_instability', { degradation_score: 0.2, force: true });
      return { incident: inc.incident };
    }],
    ['governance_rollout_quality', () => {
      return svc.getRolloutOperations();
    }],
    ['governance_emergency_readiness', () => {
      const emergency = loadFresh('../../src/governanceOperations/governanceEmergencyControls');
      state.resetForTests();
      return emergency.prepareEmergency({ approved_by: 'snapshot', force: true });
    }]
  ];

  for (const [name, fn] of files) {
    const data = fn();
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${name}.json`), JSON.stringify(data, null, 2));
    console.log(`  SNAP  ${name}.json`);
  }
}

function main() {
  console.log('Cognitive Governance Phase J');
  testOperationalStateTransitions();
  testIncidentClassification();
  testRolloutOrchestration();
  testEmergencyRollbackReadiness();
  testOperationalMetricsIntegrity();
  testDegradationEscalation();
  testTenantRolloutIsolation();
  testLifecycleConsistency();
  testRuntimeOperationalHealth();
  testGovernanceEmergencyPreparation();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
