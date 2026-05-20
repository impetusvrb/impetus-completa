'use strict';

/**
 * npm run test:kpi-runtime-stabilization
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

function resetPhaseU() {
  delete process.env.IMPETUS_KPI_RUNTIME_STABILIZATION;
  delete process.env.IMPETUS_KPI_SEMANTIC_ALIGNMENT;
  delete process.env.IMPETUS_KPI_HIERARCHY_STABILIZATION;
  delete process.env.IMPETUS_KPI_DELIVERY_PRECISION_SUPERVISION;
  process.env.IMPETUS_KPI_STABILIZATION_OBSERVABILITY = 'on';
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/kpiStabilization/') || key.includes('/kpiRollout/')) {
      delete require.cache[key];
    }
  }
  loadFresh('../../src/kpiStabilization/kpiStabilizationTelemetry').resetStabilizationTelemetry();
  loadFresh('../../src/kpiStabilization/tenantDeliveryIsolation').clearTenantStabilizationState();
}

const QUALITY_KPIS = { kpis: [{ id: 'nc_rate', domain: 'quality' }, { id: 'pass_rate', domain: 'quality' }] };
const LEAK_KPIS = {
  kpis: [
    { id: 'board_ebitda', domain: 'executive', executive_only: true },
    { id: 'oee', domain: 'operations' }
  ]
};

function testHierarchyIntegrity() {
  console.log('\n=== KPI hierarchy integrity ===');
  resetPhaseU();
  const stab = loadFresh('../../src/kpiStabilization/hierarchyDeliveryStabilizer');
  const ok = stab.stabilizeHierarchyDelivery({ role: 'coordinator', functional_axis: 'safety' }, {
    kpis: [{ id: 'lti', domain: 'safety' }]
  });
  assert(ok.stable === true, 'coordinator safety stable');
  const bad = stab.stabilizeHierarchyDelivery(
    { role: 'operator', functional_axis: 'operations' },
    LEAK_KPIS
  );
  assert(bad.stable === false, 'operator executive leak unstable');
}

function testSemanticAlignment() {
  console.log('\n=== KPI semantic alignment ===');
  resetPhaseU();
  const eng = loadFresh('../../src/kpiStabilization/kpiSemanticAlignmentEngine');
  const r = eng.alignKpiSemantics({ functional_axis: 'quality' }, QUALITY_KPIS);
  assert(r.KPI_semantic_relevance >= 0.9, 'semantic relevance');
  assert(r.auto_correct === false, 'no auto correct');
}

function testDeliveryPrecision() {
  console.log('\n=== KPI delivery precision ===');
  resetPhaseU();
  const sup = loadFresh('../../src/kpiStabilization/deliveryPrecisionSupervisor');
  const r = sup.superviseDeliveryPrecision({ functional_axis: 'quality' }, QUALITY_KPIS);
  assert(r.delivery_precision_score >= 0.8, 'precision score');
}

function testLeakageDetection() {
  console.log('\n=== KPI leakage detection ===');
  resetPhaseU();
  const sup = loadFresh('../../src/kpiStabilization/leakageSupervisor');
  const r = sup.superviseKpiLeakage({ role: 'operator', functional_axis: 'operations' }, LEAK_KPIS);
  assert(r.leakage_detected === true, 'leakage');
  assert(r.auto_correct === false, 'no auto remove');
}

function testUnderdelivery() {
  console.log('\n=== KPI underdelivery ===');
  resetPhaseU();
  const sup = loadFresh('../../src/kpiStabilization/underdeliverySupervisor');
  const r = sup.superviseKpiUnderdelivery({}, { kpis: [] }, { expected_kpi_min: 2 });
  assert(r.underdelivery === true, 'underdelivery');
}

function testAuthorityConflicts() {
  console.log('\n=== KPI authority conflicts ===');
  resetPhaseU();
  const sup = loadFresh('../../src/kpiStabilization/authorityConflictSupervisor');
  const r = sup.superviseAuthorityConflicts({ scope_level: 1 }, { kpis: [{ id: 'x', requires_authority: 9 }] });
  assert(r.conflict_detected === true, 'conflict');
}

function testContextualRelevance() {
  console.log('\n=== KPI contextual relevance ===');
  resetPhaseU();
  const val = loadFresh('../../src/kpiStabilization/contextualKpiSemanticValidator');
  const r = val.validateContextualKpiSemantics({ functional_axis: 'environmental' }, {
    kpis: [{ id: 'emissions', domain: 'environmental' }]
  });
  assert(r.contextual_alignment_score >= 0.9, 'aligned');
}

function testOperationalUsefulness() {
  console.log('\n=== KPI operational usefulness ===');
  resetPhaseU();
  const ana = loadFresh('../../src/kpiStabilization/operationalKpiRelevanceAnalyzer');
  const r = ana.analyzeOperationalKpiRelevance({ functional_axis: 'logistics' }, {
    kpis: [{ id: 'otif', domain: 'logistics' }]
  });
  assert(r.KPI_operational_usefulness >= 0.9, 'usefulness');
}

function testTargetingStabilization() {
  console.log('\n=== KPI targeting stabilization ===');
  resetPhaseU();
  const eng = loadFresh('../../src/kpiStabilization/runtimeDeliveryCorrectionEngine');
  const r = eng.correctRuntimeDelivery({ functional_axis: 'quality' }, QUALITY_KPIS);
  assert(r.auto_correct === false, 'supervised only');
  assert(r.stable === true, 'quality stable');
}

function testTenantSafe() {
  console.log('\n=== Tenant-safe stabilization ===');
  resetPhaseU();
  const sup = loadFresh('../../src/kpiStabilization/tenantStabilizationSupervisor');
  const r = sup.superviseTenantStabilization('tenant-u', { functional_axis: 'quality' }, QUALITY_KPIS);
  assert(r.protection?.cross_tenant_correction_blocked === true, 'tenant isolated');
  assert(r.auto_correct === false, 'no auto');
}

function testCorrectionEngine() {
  console.log('\n=== Runtime delivery correction ===');
  resetPhaseU();
  const corr = loadFresh('../../src/kpiStabilization/contextualTargetingCorrection');
  const r = corr.correctContextualTargeting(
    { functional_axis: 'hr' },
    { kpis: [{ id: 'oee', domain: 'operations' }] }
  );
  assert(r.corrections.length >= 1, 'suggests correction');
  assert(r.auto_correct === false, 'no auto apply');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseU();
  const facade = loadFresh('../../src/kpiStabilization/kpiStabilizationFacade');
  const r = facade.enrichKpiRuntimeStabilization(
    { id: 1, functional_axis: 'quality', company_id: 1 },
    QUALITY_KPIS,
    { force: true }
  );
  assert(r.kpi_runtime_stabilization?.phase === 'U', 'phase U');
  assert(r.delivery_precision?.delivery_precision_score != null, 'delivery precision');
  assert(r.kpi_semantic_alignment?.KPI_semantic_relevance != null, 'semantic');
  assert(r.hierarchy_delivery_integrity?.hierarchy_delivery_integrity != null, 'hierarchy');
}

function testFeatureFlags() {
  console.log('\n=== Feature flags ===');
  resetPhaseU();
  const f = loadFresh('../../src/kpiStabilization/config/phaseUFeatureFlags');
  assert(f.isKpiRuntimeStabilizationEnabled() === false, 'stabilization off');
  assert(f.isKpiStabilizationObservabilityEnabled() === true, 'observability on');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseU();
  const facade = loadFresh('../../src/kpiStabilization/kpiStabilizationFacade');
  const personas = [
    ['executive', 'executive', [{ id: 'ebitda', domain: 'executive' }]],
    ['director', 'operations', [{ id: 'plant_oee', domain: 'operations' }]],
    ['coordinator', 'safety', [{ id: 'lti', domain: 'safety' }]],
    ['supervisor', 'quality', [{ id: 'defect', domain: 'quality' }]],
    ['operator', 'operations', [{ id: 'oee', domain: 'operations' }]],
    ['hr', 'hr', [{ id: 'turnover', domain: 'hr' }]],
    ['quality', 'quality', [{ id: 'nc', domain: 'quality' }]],
    ['environmental', 'environmental', [{ id: 'co2', domain: 'environmental' }]],
    ['safety', 'safety', [{ id: 'trir', domain: 'safety' }]],
    ['financial', 'financial', [{ id: 'margin', domain: 'financial' }]],
    ['logistics', 'logistics', [{ id: 'otif', domain: 'logistics' }]],
    ['engineering', 'operations', [{ id: 'mtbf', domain: 'operations' }]]
  ];
  for (const [file, axis, kpiList] of personas) {
    const r = facade.enrichKpiRuntimeStabilization(
      { id: 1, functional_axis: axis, role: file },
      { kpis: kpiList },
      { force: true }
    );
    const snap = {
      kpi_runtime_stabilization: r.kpi_runtime_stabilization,
      kpi_delivery_precision: r.kpi_delivery_precision,
      kpi_semantic_alignment: r.kpi_semantic_alignment,
      kpi_hierarchy_delivery_integrity: r.kpi_hierarchy_delivery_integrity
    };
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(snap, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('KPI Runtime Stabilization — Phase U');
  testHierarchyIntegrity();
  testSemanticAlignment();
  testDeliveryPrecision();
  testLeakageDetection();
  testUnderdelivery();
  testAuthorityConflicts();
  testContextualRelevance();
  testOperationalUsefulness();
  testTargetingStabilization();
  testTenantSafe();
  testCorrectionEngine();
  testFacadeObservability();
  testFeatureFlags();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
