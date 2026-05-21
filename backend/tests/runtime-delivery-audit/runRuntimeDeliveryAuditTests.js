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
  process.env.IMPETUS_RUNTIME_DELIVERY_OBSERVABILITY = 'on';
  for (const k of Object.keys(require.cache)) {
    if (k.includes('/runtimeDeliveryAudit/') || k.includes('/canonicalModuleGovernance/')) {
      delete require.cache[k];
    }
  }
}

function testStageShape() {
  console.log('\n=== Stage shape ===');
  reset();
  const { createStage } = loadFresh('../../src/runtimeDeliveryAudit/deliveryTraceCollector');
  const s = createStage({
    stage: 'test',
    modules_before: ['a'],
    modules_after: ['b'],
    added_modules: ['b'],
    removed_modules: ['a']
  });
  assert(s.stage === 'test' && s.timestamp, 'shape ok');
}

function testRhNoSstSidebarTrace() {
  console.log('\n=== RH sem SST trace ===');
  reset();
  const t = loadFresh('../../src/runtimeDeliveryAudit/sidebarDeliveryTrace');
  const r = t.traceSidebarDelivery(
    {
      visible_modules: ['dashboard', 'hr_intelligence', 'safety_intelligence'],
      sidebar_governance_runtime: {
        governance_applied: true,
        final_visible_modules: ['dashboard', 'hr_intelligence'],
        removed_modules: [{ module: 'safety_intelligence' }],
        denied_publications: ['safety_intelligence']
      }
    },
    { domain_axis: 'hr' }
  );
  assert(!r.final_visible_modules.includes('safety_intelligence'), 'no sst');
}

function testQualityLeakageDetected() {
  console.log('\n=== Qualidade leakage ===');
  reset();
  const t = loadFresh('../../src/runtimeDeliveryAudit/sidebarDeliveryTrace');
  const r = t.traceSidebarDelivery(
    {
      visible_modules: ['dashboard', 'quality_intelligence', 'safety_intelligence'],
      sidebar_governance_runtime: { governance_applied: false }
    },
    { domain_axis: 'quality' }
  );
  assert(r.stages.length > 0, 'stages');
}

function testLegacyInjectorCatalog() {
  console.log('\n=== Legacy injectors ===');
  reset();
  const l = loadFresh('../../src/runtimeDeliveryAudit/legacyInjectionTrace');
  const r = l.auditLegacyInjectors();
  assert(r.reinjection_capable.some((i) => i.injector_name.includes('safeMergeSafety')), 'safety injector');
}

function testPipelineOrder() {
  console.log('\n=== Pipeline order ===');
  reset();
  const p = loadFresh('../../src/runtimeDeliveryAudit/runtimePipelineOrderTrace');
  const r = p.buildPipelineOrderTrace([{ stage: 'identity', execution_order: 1, modules_after: ['dashboard'] }]);
  assert(r.canonical_order.length >= 10, 'order defined');
}

function testKpiExecutiveLeakage() {
  console.log('\n=== KPI executive leakage ===');
  reset();
  const k = loadFresh('../../src/runtimeDeliveryAudit/kpiDeliveryTrace');
  const r = k.traceKpiDelivery(
    {
      original_kpis: [{ key: 'faturamento' }, { key: 'open_nc' }],
      final_kpis: [{ key: 'faturamento' }, { key: 'open_nc' }]
    },
    { domain_axis: 'quality', hierarchy_tier: 'coordination' }
  );
  assert(r.kpi_delivery_audit.leakage_detected, 'leak');
}

function testSummaryCrossDomain() {
  console.log('\n=== Summary cross-domain ===');
  reset();
  const s = loadFresh('../../src/runtimeDeliveryAudit/summaryDeliveryTrace');
  const r = s.traceSummaryDelivery(
    { summary_text: 'Revisar SST e APR no setor' },
    { domain_axis: 'quality' }
  );
  assert(r.summary_delivery_audit.leakage_detected, 'narrative leak');
}

function testBlockReinjection() {
  console.log('\n=== Block reinjection ===');
  reset();
  const h = loadFresh('../../src/runtimeDeliveryAudit/deliveryGovernanceHardening');
  const r = h.isModuleReinjectionBlocked('safety_intelligence', ['safety_intelligence'], []);
  assert(r.blocked, 'blocked');
}

function testSingleSourceOfTruth() {
  console.log('\n=== Single source of truth ===');
  reset();
  const h = loadFresh('../../src/runtimeDeliveryAudit/deliveryGovernanceHardening');
  const r = h.enforceSingleSourceOfTruth(
    { governance_applied: true, final_visible_modules: ['dashboard', 'quality_intelligence'] },
    ['dashboard', 'safety_intelligence']
  );
  assert(r.single_source_enforced && !r.modules.includes('safety_intelligence'), 'sot');
}

function testContextualMergeConflict() {
  console.log('\n=== Contextual merge conflict ===');
  reset();
  const c = loadFresh('../../src/runtimeDeliveryAudit/contextualMergeTrace');
  const r = c.traceContextualMerge(
    ['dashboard'],
    [{ module_id: 'safety_intelligence' }],
    ['dashboard', 'safety_intelligence'],
    { governance_applied: true }
  );
  assert(r.contextual_merge_trace.reintroduced_by_contextual.includes('safety_intelligence'), 'reinject');
}

function testDashboardMeAudit() {
  console.log('\n=== Dashboard me audit ===');
  reset();
  const f = loadFresh('../../src/runtimeDeliveryAudit/deliveryAuditFacade');
  const r = f.auditDashboardMeDelivery(
    { company_id: 't1', job_title: 'Coordenador de Qualidade', department: 'Qualidade' },
    {
      visible_modules: ['dashboard', 'safety_intelligence', 'quality_intelligence'],
      profile_code: 'coordinator_quality',
      sidebar_governance_runtime: {
        governance_applied: true,
        final_visible_modules: ['dashboard', 'quality_intelligence'],
        removed_modules: ['safety_intelligence'],
        denied_publications: ['safety_intelligence']
      }
    },
    { legacy_visible_modules: ['dashboard', 'safety_intelligence', 'quality_intelligence'] }
  );
  assert(r.delivery_governance_trace, 'trace');
  assert(r.delivery_pipeline_report, 'report');
  assert(!r.payload.visible_modules.includes('safety_intelligence'), 'hardened payload');
}

function testConsolidatedReport() {
  console.log('\n=== Consolidated report ===');
  reset();
  const g = loadFresh('../../src/runtimeDeliveryAudit/deliveryGovernanceAudit');
  const r = g.consolidateGovernanceAudit({
    sidebar: { leakage_detected: true, stages: [] },
    denied_publications: ['safety_intelligence']
  });
  assert(r.stabilization_recommendations.length > 0, 'recommendations');
}

function testNoAutoRemediate() {
  console.log('\n=== No auto-remediate ===');
  reset();
  const f = loadFresh('../../src/runtimeDeliveryAudit/deliveryAuditFacade');
  const s = f.getDeliveryAuditStatus();
  assert(s.auto_remediate === false, 'no auto');
}

function testCockpitTrace() {
  console.log('\n=== Cockpit trace ===');
  reset();
  const c = loadFresh('../../src/runtimeDeliveryAudit/cockpitDeliveryTrace');
  const r = c.traceCockpitDelivery({ cockpit_blocks: { faturamento: true } }, { hierarchy_tier: 'coordination' });
  assert(r.cockpit_delivery_audit.leakage_detected, 'exec on coord');
}

function testInsightTrace() {
  console.log('\n=== Insight trace ===');
  reset();
  const i = loadFresh('../../src/runtimeDeliveryAudit/insightDeliveryTrace');
  const r = i.traceInsightDelivery({ insights: [{ title: 'test' }] }, {});
  assert(r.insight_delivery_audit.count === 1, 'count');
}

function testCollectorOverwrite() {
  console.log('\n=== Overwrite detection ===');
  reset();
  const { DeliveryTraceCollector } = loadFresh('../../src/runtimeDeliveryAudit/deliveryTraceCollector');
  const col = new DeliveryTraceCollector();
  col.recordModuleTransition('a', 's1', [], ['x']);
  col.recordModuleTransition('b', 's2', ['x'], ['x', 'y']);
  const ow = col.detectOverwrites();
  assert(Array.isArray(ow), 'overwrites array');
}

function testFilterContextualHardened() {
  console.log('\n=== Filter contextual hardened ===');
  reset();
  const h = loadFresh('../../src/runtimeDeliveryAudit/deliveryGovernanceHardening');
  const r = h.filterContextualModulesHardened(
    [{ module_id: 'safety_intelligence' }, { module_id: 'quality_intelligence' }],
    {
      governance_applied: true,
      denied_publications: ['safety_intelligence'],
      removed_modules: ['safety_intelligence']
    }
  );
  assert(r.filtered && r.modules.length === 1, 'filtered');
}

function testSstNoRhMatrix() {
  console.log('\n=== SST sem RH ===');
  reset();
  const d = loadFresh('../../src/canonicalModuleGovernance/domainModuleMatrix');
  assert(!d.isModuleAllowedByDomain('hr_intelligence', 'safety').allowed, 'hr denied sst');
}

function testEnvironmentalNoQuality() {
  console.log('\n=== Ambiental sem qualidade ===');
  reset();
  const d = loadFresh('../../src/canonicalModuleGovernance/domainModuleMatrix');
  assert(!d.isModuleAllowedByDomain('quality_intelligence', 'environmental').allowed, 'q denied');
}

function testExecutivePipeline() {
  console.log('\n=== Executivo pipeline ===');
  reset();
  const d = loadFresh('../../src/canonicalModuleGovernance/safeSidebarPruningRuntime');
  const r = d.applySafeSidebarPruning(['dashboard', 'manuia', 'safety_intelligence'], {
    domain_axis: 'executive',
    hierarchy_tier: 'executive',
    hierarchy_level: 1
  });
  assert(!r.visible_modules.includes('manuia'), 'no manuia');
}

function testObservabilityAlwaysOn() {
  console.log('\n=== Observability on ===');
  reset();
  const f = loadFresh('../../src/runtimeDeliveryAudit/deliveryAuditFacade');
  assert(f.isAuditActive({}), 'audit active with obs');
}

function main() {
  console.log('Runtime Delivery Audit — Phase Z.15');
  testStageShape();
  testRhNoSstSidebarTrace();
  testQualityLeakageDetected();
  testLegacyInjectorCatalog();
  testPipelineOrder();
  testKpiExecutiveLeakage();
  testSummaryCrossDomain();
  testBlockReinjection();
  testSingleSourceOfTruth();
  testContextualMergeConflict();
  testDashboardMeAudit();
  testConsolidatedReport();
  testNoAutoRemediate();
  testCockpitTrace();
  testInsightTrace();
  testCollectorOverwrite();
  testFilterContextualHardened();
  testSstNoRhMatrix();
  testEnvironmentalNoQuality();
  testExecutivePipeline();
  testObservabilityAlwaysOn();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
main();
