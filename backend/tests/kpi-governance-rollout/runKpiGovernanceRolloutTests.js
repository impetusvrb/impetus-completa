'use strict';

/**
 * npm run test:kpi-governance-rollout
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

function resetPhaseT() {
  delete process.env.IMPETUS_KPI_GOVERNANCE_ROLLOUT;
  delete process.env.IMPETUS_KPI_TARGETING_VALIDATION;
  delete process.env.IMPETUS_KPI_PRECISION_RUNTIME;
  delete process.env.IMPETUS_KPI_DELIVERY_STABILIZATION;
  delete process.env.IMPETUS_KPI_GOVERNANCE;
  process.env.IMPETUS_KPI_GOVERNANCE_OBSERVABILITY = 'on';
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/kpiRollout/') || key.includes('/controlledActivation/')) {
      delete require.cache[key];
    }
  }
  loadFresh('../../src/kpiRollout/kpiGovernanceTelemetry').resetKpiGovernanceTelemetry();
  loadFresh('../../src/kpiRollout/tenantKpiIsolation').clearTenantKpiState();
  loadFresh('../../src/kpiRollout/kpiRuntimeActivationCoordinator').resetRolloutMemory();
  loadFresh('../../src/controlledActivation/channelActivationGovernance').resetChannelActivation();
}

const SAMPLE_KPIS_QUALITY = {
  kpis: [
    { id: 'defect_rate', domain: 'quality' },
    { id: 'inspection_pass', domain: 'quality' }
  ]
};

const SAMPLE_KPIS_LEAK = {
  kpis: [
    { id: 'board_margin', domain: 'executive', executive_only: true },
    { id: 'line_oee', domain: 'operations' }
  ]
};

function testHierarchyValidation() {
  console.log('\n=== KPI hierarchy validation ===');
  resetPhaseT();
  const val = loadFresh('../../src/kpiRollout/hierarchyKpiValidator');
  const ok = val.validateHierarchyKpis(
    { role: 'coordinator' },
    { kpis: [{ id: 'k1', domain: 'safety' }] }
  );
  assert(ok.valid === true, 'coordinator valid');
  const bad = val.validateHierarchyKpis(
    { role: 'operator' },
    { kpis: [{ id: 'exec_kpi', executive_only: true }] }
  );
  assert(bad.valid === false, 'executive leakage blocked');
}

function testDomainIsolation() {
  console.log('\n=== KPI domain isolation ===');
  resetPhaseT();
  const val = loadFresh('../../src/kpiRollout/domainKpiValidator');
  const ok = val.validateDomainKpis({ functional_axis: 'quality' }, SAMPLE_KPIS_QUALITY);
  assert(ok.valid === true, 'quality domain ok');
  const bad = val.validateDomainKpis(
    { functional_axis: 'hr' },
    { kpis: [{ id: 'oee_line', domain: 'operations' }] }
  );
  assert(bad.valid === false, 'hr vs operations blocked');
}

function testDeliveryPrecision() {
  console.log('\n=== KPI delivery precision ===');
  resetPhaseT();
  const prec = loadFresh('../../src/kpiRollout/kpiPrecisionRuntime');
  const r = prec.computeKpiPrecisionRuntime({ functional_axis: 'quality' }, SAMPLE_KPIS_QUALITY, {});
  assert(r.KPI_precision >= 0.85, 'precision high');
  assert(r.shadow_only === true, 'shadow default');
}

function testLeakageDetection() {
  console.log('\n=== KPI leakage detection ===');
  resetPhaseT();
  const det = loadFresh('../../src/kpiRollout/kpiLeakageDetector');
  const r = det.detectKpiLeakage({ role: 'operator', functional_axis: 'operations' }, SAMPLE_KPIS_LEAK, {});
  assert(r.leakage_detected === true, 'leakage detected');
}

function testUnderdelivery() {
  console.log('\n=== KPI underdelivery ===');
  resetPhaseT();
  const det = loadFresh('../../src/kpiRollout/kpiUnderdeliveryDetector');
  const r = det.detectKpiUnderdelivery({}, { kpis: [] }, { expected_kpi_min: 2 });
  assert(r.underdelivery === true, 'underdelivery');
}

function testAuthorityConflicts() {
  console.log('\n=== KPI authority conflicts ===');
  resetPhaseT();
  const det = loadFresh('../../src/kpiRollout/kpiAuthorityConflictDetector');
  const r = det.detectKpiAuthorityConflicts(
    { scope_level: 1 },
    { kpis: [{ id: 'x', requires_authority: 5 }] }
  );
  assert(r.conflict_detected === true, 'authority conflict');
}

function testRolloutSafety() {
  console.log('\n=== KPI rollout safety ===');
  resetPhaseT();
  const eng = loadFresh('../../src/kpiRollout/kpiGovernanceActivationEngine');
  const prep = eng.activateKpiGovernance(
    { company_id: 1, functional_axis: 'quality' },
    SAMPLE_KPIS_QUALITY,
    { readiness_threshold: 0.75 }
  );
  assert(prep.prepared === true && prep.global_activation === false, 'prepare only');
  assert(prep.auto_executed === false, 'no auto execute');
}

function testRollbackReadiness() {
  console.log('\n=== KPI rollback readiness ===');
  resetPhaseT();
  const coord = loadFresh('../../src/kpiRollout/tenantKpiRollbackCoordinator');
  const prep = coord.planTenantKpiRollback('tenant-1', {});
  assert(prep.rollback_prepared === true, 'rollback prepared');
  const done = coord.planTenantKpiRollback('tenant-1', { execute: true, approved_by: 'ops' });
  assert(done.rollback_executed === true, 'rollback executed');
}

function testTenantIsolation() {
  console.log('\n=== KPI tenant isolation ===');
  resetPhaseT();
  const iso = loadFresh('../../src/kpiRollout/tenantKpiIsolation');
  iso.setTenantKpiRolloutActive('t-a', true, { approved_by: 'a' });
  const b = iso.getTenantKpiState('t-b');
  assert(b.rollout_active === false, 'tenant-b isolated');
}

function testTargetingConsistency() {
  console.log('\n=== KPI targeting consistency ===');
  resetPhaseT();
  const val = loadFresh('../../src/kpiRollout/operationalKpiDeliveryValidator');
  const r = val.validateOperationalKpiDelivery({ functional_axis: 'safety' }, {
    kpis: [{ id: 'lti', domain: 'safety' }]
  });
  assert(r.valid === true, 'operational delivery valid');
}

function testActivationReadinessThreshold() {
  console.log('\n=== Activation readiness threshold ===');
  resetPhaseT();
  const eng = loadFresh('../../src/kpiRollout/kpiGovernanceActivationEngine');
  const low = eng.activateKpiGovernance(
    { functional_axis: 'general' },
    { kpis: [] },
    { execute: true, approved_by: 'x', readiness_threshold: 0.99 }
  );
  assert(low.activated === false && low.reason === 'readiness_below_threshold', 'blocks low readiness');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseT();
  const facade = loadFresh('../../src/kpiRollout/kpiRolloutFacade');
  const r = facade.enrichKpiGovernanceRollout(
    { id: 1, functional_axis: 'quality', company_id: 1 },
    SAMPLE_KPIS_QUALITY,
    { force: true }
  );
  assert(r.kpi_governance?.phase === 'T', 'phase T');
  assert(r.kpi_precision?.KPI_precision != null, 'kpi_precision block');
  assert(r.kpi_delivery_validation?.valid != null, 'delivery validation');
  assert(r.kpi_targeting_integrity?.targeting_precision != null, 'targeting integrity');
}

function testFeatureFlags() {
  console.log('\n=== Feature flags ===');
  resetPhaseT();
  const f = loadFresh('../../src/kpiRollout/config/phaseTFeatureFlags');
  assert(f.isKpiGovernanceRolloutEnabled() === false, 'rollout off');
  assert(f.isKpiGovernanceObservabilityEnabled() === true, 'observability on');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseT();
  const facade = loadFresh('../../src/kpiRollout/kpiRolloutFacade');
  const personas = [
    ['executive', 'executive', [{ id: 'ebitda', domain: 'executive' }]],
    ['director', 'operations', [{ id: 'plant_oee', domain: 'operations' }]],
    ['coordinator', 'safety', [{ id: 'lti', domain: 'safety' }]],
    ['supervisor', 'quality', [{ id: 'defect', domain: 'quality' }]],
    ['operator', 'operations', [{ id: 'oee', domain: 'operations' }]],
    ['hr', 'hr', [{ id: 'turnover', domain: 'hr' }]],
    ['quality', 'quality', [{ id: 'nc_rate', domain: 'quality' }]],
    ['environmental', 'environmental', [{ id: 'emissions', domain: 'environmental' }]],
    ['safety', 'safety', [{ id: 'trir', domain: 'safety' }]],
    ['financial', 'financial', [{ id: 'margin', domain: 'financial' }]],
    ['logistics', 'logistics', [{ id: 'otif', domain: 'logistics' }]]
  ];
  for (const [file, axis, kpiList] of personas) {
    const r = facade.enrichKpiGovernanceRollout(
      { id: 1, functional_axis: axis, role: file },
      { kpis: kpiList },
      { force: true }
    );
    const snap = {
      kpi_governance: r.kpi_governance,
      kpi_precision: r.kpi_precision,
      kpi_targeting_integrity: r.kpi_targeting_integrity
    };
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(snap, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('KPI Governance Rollout — Phase T');
  testHierarchyValidation();
  testDomainIsolation();
  testDeliveryPrecision();
  testLeakageDetection();
  testUnderdelivery();
  testAuthorityConflicts();
  testRolloutSafety();
  testRollbackReadiness();
  testTenantIsolation();
  testTargetingConsistency();
  testActivationReadinessThreshold();
  testFacadeObservability();
  testFeatureFlags();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
