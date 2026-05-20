'use strict';

/**
 * npm run test:contextual-delivery-stabilization
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
    if (d) console.log('       ', JSON.stringify(d).slice(0, 300));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function resetPhaseP() {
  delete process.env.IMPETUS_CONTEXTUAL_DELIVERY_STABILIZATION;
  delete process.env.IMPETUS_HIERARCHY_STABILIZATION;
  delete process.env.IMPETUS_FUNCTIONAL_DOMAIN_STABILIZATION;
  delete process.env.IMPETUS_GOVERNED_MODULE_TARGETING;
  delete process.env.IMPETUS_DASHBOARD_STABILIZATION;
  process.env.IMPETUS_CONTEXTUAL_STABILIZATION_OBSERVABILITY = 'on';
  delete require.cache[require.resolve('../../src/contextualDeliveryStabilization/config/phasePFeatureFlags')];
  loadFresh('../../src/contextualDeliveryStabilization/deliveryStabilityTelemetry').resetDeliveryStabilityTelemetry();
}

function userPersona(name, overrides = {}) {
  const personas = {
    executive: { hierarchy_level: 1, role: 'executive', functional_axis: 'executive' },
    director: { hierarchy_level: 2, role: 'director', functional_axis: 'quality' },
    coordinator: { hierarchy_level: 3, role: 'coordinator', functional_axis: 'safety' },
    supervisor: { hierarchy_level: 4, role: 'supervisor', functional_axis: 'operations' },
    operator: { hierarchy_level: 5, role: 'operator', functional_axis: 'operations' },
    hr: { hierarchy_level: 3, role: 'hr_analyst', functional_axis: 'hr' },
    financial: { hierarchy_level: 3, role: 'financial', functional_axis: 'financial' },
    quality: { hierarchy_level: 4, role: 'quality', functional_axis: 'quality' },
    environmental: { hierarchy_level: 4, role: 'environmental', functional_axis: 'environmental' },
    safety: { hierarchy_level: 4, role: 'safety', functional_axis: 'safety' },
    logistics: { hierarchy_level: 5, role: 'logistics', functional_axis: 'logistics' },
    engineering: { hierarchy_level: 4, role: 'engineering', functional_axis: 'quality' }
  };
  return { id: 1, company_id: 10, ...personas[name], ...overrides };
}

function testHierarchyIsolation() {
  console.log('\n=== Hierarchy isolation ===');
  resetPhaseP();
  const eng = loadFresh('../../src/contextualDeliveryStabilization/hierarchyStabilizationEngine');
  const r = eng.stabilizeHierarchy(userPersona('operator'), ['executive', 'dashboard'], { functional_axis: 'operations' });
  assert(r.denied_hierarchy.length >= 1, 'executive denied on operator');
}

function testAuthorityIsolation() {
  console.log('\n=== Authority isolation ===');
  const auth = loadFresh('../../src/contextualDeliveryStabilization/operationalAuthorityResolver');
  const r = auth.resolveOperationalAuthority(userPersona('operator'), { functional_axis: 'operations' });
  assert(r.can_view_corporate_aggregate === false, 'operator no corporate');
}

function testContextualTargeting() {
  console.log('\n=== Contextual targeting ===');
  const eng = loadFresh('../../src/contextualDeliveryStabilization/enterpriseContextualTargetingEngine');
  const r = eng.buildContextualTarget(userPersona('quality'), { functional_axis: 'quality' });
  assert(r.contextual_delivery_confidence > 0.8, 'confidence high');
}

function testDashboardStabilization() {
  console.log('\n=== Dashboard stabilization ===');
  const dash = loadFresh('../../src/contextualDeliveryStabilization/dashboardDeliveryStabilizer');
  const r = dash.stabilizeDashboardDelivery(
    userPersona('safety'),
    [{ id: 'w1', domain: 'safety' }, { id: 'w2', domain: 'quality' }],
    { domain: 'safety', hierarchy_band: 'supervisor' }
  );
  assert(r.denied.length === 1, 'wrong domain widget denied');
}

function testModuleTargetingPrecision() {
  console.log('\n=== Module targeting precision ===');
  const mod = loadFresh('../../src/contextualDeliveryStabilization/governedModuleTargeting');
  const r = mod.targetModules(['quality', 'sst', 'dashboard'], userPersona('quality'), { functional_axis: 'quality', hierarchy_band: 'coordinator' });
  assert(r.module_targeting_precision >= 0.66, 'precision ok');
}

function testKpiTargeting() {
  console.log('\n=== KPI targeting ===');
  const kpi = loadFresh('../../src/contextualDeliveryStabilization/stabilizedKpiResolver');
  const r = kpi.resolveStabilizedKpis(
    { kpis: [{ id: 'k1', domain: 'quality' }, { id: 'k2', domain: 'safety', generic_fallback: true }] },
    userPersona('quality'),
    { domain: 'quality' }
  );
  assert(r.denied.length >= 1, 'corporate kpi denied');
}

function testSummaryTargeting() {
  console.log('\n=== Summary targeting ===');
  const sum = loadFresh('../../src/contextualDeliveryStabilization/stabilizedSummaryResolver');
  const bad = sum.resolveStabilizedSummary({ synthetic: true }, userPersona('hr'), { domain: 'hr' });
  const good = sum.resolveStabilizedSummary({ text: 'ok', sources: ['db'] }, userPersona('hr'), { domain: 'hr' });
  assert(bad.allowed === false, 'synthetic without provenance denied');
  assert(good.allowed === true, 'provenance ok');
}

function testDomainStabilization() {
  console.log('\n=== Domain stabilization ===');
  const dom = loadFresh('../../src/contextualDeliveryStabilization/functionalDomainStabilizer');
  const r = dom.stabilizeFunctionalDomain(userPersona('hr'), ['hr', 'quality'], { functional_axis: 'hr' });
  assert(r.denied_domain.some((d) => d.module_id === 'quality'), 'quality denied on hr');
}

function testContextualConflicts() {
  console.log('\n=== Contextual conflicts ===');
  const det = loadFresh('../../src/contextualDeliveryStabilization/contextualConflictDetector');
  const r = det.detectContextualConflict({ domain_a: 'quality', domain_b: 'safety' });
  assert(r.conflict_detected === true, 'domain conflict');
}

function testHierarchyConflicts() {
  console.log('\n=== Hierarchy conflicts ===');
  const det = loadFresh('../../src/contextualDeliveryStabilization/hierarchyConflictDetector');
  const r = det.detectHierarchyConflict({ hierarchy_band: 'operator', has_executive_module: true });
  assert(r.hierarchy_conflict === true, 'hierarchy conflict');
}

function testAuthorityOverlap() {
  console.log('\n=== Authority overlap ===');
  const det = loadFresh('../../src/contextualDeliveryStabilization/authorityConflictDetector');
  const r = det.detectAuthorityConflict({ corporate_view: true, can_view_corporate: false });
  assert(r.authority_overlap === true, 'authority overlap');
}

function testDeliveryStability() {
  console.log('\n=== Delivery stability ===');
  const tel = loadFresh('../../src/contextualDeliveryStabilization/deliveryStabilityTelemetry');
  tel.recordDeliveryStabilitySample({ contextual_delivery_stability: 0.93 });
  assert(tel.getDeliveryStabilityTelemetry().contextual_delivery_stability > 0.88, 'telemetry');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseP();
  const facade = loadFresh('../../src/contextualDeliveryStabilization/contextualDeliveryStabilizationFacade');
  const { contextual_delivery } = facade.enrichWithContextualDeliveryStabilization(
    userPersona('safety'),
    { visible_modules: ['sst', 'quality', 'dashboard'], functional_axis: 'safety' },
    { force: true }
  );
  assert(contextual_delivery?.phase === 'P', 'phase P');
  assert(contextual_delivery?.auto_enforce === false, 'no auto enforce');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseP();
  const facade = loadFresh('../../src/contextualDeliveryStabilization/contextualDeliveryStabilizationFacade');
  const names = ['executive', 'director', 'coordinator', 'supervisor', 'operator', 'hr', 'financial', 'quality', 'environmental', 'safety', 'logistics', 'engineering'];
  for (const name of names) {
    const u = userPersona(name);
    const modules = name === 'executive' ? ['executive', 'analytics', 'dashboard'] : name === 'hr' ? ['hr', 'dashboard'] : ['dashboard', 'quality', 'sst'];
    const { contextual_delivery } = facade.enrichWithContextualDeliveryStabilization(
      u,
      { visible_modules: modules, functional_axis: u.functional_axis },
      { force: true }
    );
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${name}.json`), JSON.stringify(contextual_delivery, null, 2));
    console.log(`  SNAP  ${name}.json`);
  }
}

function main() {
  console.log('Contextual Delivery Stabilization — Phase P');
  testHierarchyIsolation();
  testAuthorityIsolation();
  testContextualTargeting();
  testDashboardStabilization();
  testModuleTargetingPrecision();
  testKpiTargeting();
  testSummaryTargeting();
  testDomainStabilization();
  testContextualConflicts();
  testHierarchyConflicts();
  testAuthorityOverlap();
  testDeliveryStability();
  testFacadeObservability();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
