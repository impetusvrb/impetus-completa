'use strict';

/**
 * npm run test:runtime-consolidation
 */

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

function resetConsolidation() {
  delete process.env.IMPETUS_RUNTIME_CONSOLIDATION;
  delete process.env.IMPETUS_LEGACY_REDUCTION_ANALYSIS;
  process.env.IMPETUS_RUNTIME_CONSOLIDATION_OBSERVABILITY = 'on';
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/runtimeConsolidation/')) delete require.cache[key];
  }
  loadFresh('../../src/runtimeConsolidation/runtimeConsolidationTelemetry').resetConsolidationTelemetry();
}

const RICH_CTX = {
  runtime_stabilization: {},
  kpi_runtime_stabilization: {},
  runtime_enrichment: {},
  precision_delivery: {},
  contextual_delivery: {},
  runtime_consistency: {},
  controlled_activation: {},
  tenant_rollout: {},
  runtime_calibration: {},
  runtime_tuning: {},
  semantic_enrichment: {},
  kpi_governance: {},
  summary_governance: {}
};

function testFlags() {
  console.log('\n=== Feature flags ===');
  resetConsolidation();
  const f = loadFresh('../../src/runtimeConsolidation/config/runtimeConsolidationFeatureFlags');
  assert(f.isRuntimeConsolidationEnabled() === false, 'consolidation off');
  assert(f.isRuntimeConsolidationObservabilityEnabled() === true, 'obs on');
}

function testRedundancyAnalysis() {
  console.log('\n=== Redundancy analysis ===');
  resetConsolidation();
  const a = loadFresh('../../src/runtimeConsolidation/runtimeConsolidationAnalyzer');
  const r = a.analyzeRuntimeConsolidation(RICH_CTX);
  assert(r.overlap_total >= 2, 'overlaps');
  assert(r.auto_remove === false, 'no auto remove');
}

function testLegacyAnalysis() {
  console.log('\n=== Legacy analysis ===');
  resetConsolidation();
  const l = loadFresh('../../src/runtimeConsolidation/legacyResolverAnalysis');
  const r = l.analyzeLegacyResolvers({
    semantic_enrichment: {},
    precision_delivery: {},
    runtime_enrichment: {}
  });
  assert(r.legacy_total >= 1, 'legacy hits');
  assert(r.auto_remove === false, 'analysis only');
}

function testDependencyGraph() {
  console.log('\n=== Dependency graph ===');
  resetConsolidation();
  const g = loadFresh('../../src/runtimeConsolidation/pipelineDependencyGraph');
  const r = g.buildPipelineDependencyGraph({ ...RICH_CTX, force_graph: true });
  assert(r.node_count >= 5, 'nodes');
  assert(r.risk_analysis.auto_remove_forbidden === true, 'no auto remove');
  assert(r.risk_analysis.rollback_safe === true, 'rollback safe');
}

function testSimplificationAdvisor() {
  console.log('\n=== Simplification advisor ===');
  resetConsolidation();
  const a = loadFresh('../../src/runtimeConsolidation/runtimeConsolidationAnalyzer');
  const g = loadFresh('../../src/runtimeConsolidation/pipelineDependencyGraph');
  const l = loadFresh('../../src/runtimeConsolidation/legacyResolverAnalysis');
  const s = loadFresh('../../src/runtimeConsolidation/runtimeSimplificationAdvisor');
  const analysis = a.analyzeRuntimeConsolidation(RICH_CTX);
  const graph = g.buildPipelineDependencyGraph(RICH_CTX);
  const legacy = l.analyzeLegacyResolvers(RICH_CTX);
  const r = s.adviseRuntimeSimplification(analysis, graph, legacy, RICH_CTX);
  assert(r.simplification_recommendations.length >= 1, 'recommendations');
  assert(r.auto_remove === false && r.auto_apply === false, 'recommendation only');
}

function testFacadeReport() {
  console.log('\n=== Facade report ===');
  resetConsolidation();
  const facade = loadFresh('../../src/runtimeConsolidation/runtimeConsolidationFacade');
  const r = facade.getRuntimeConsolidationReport(RICH_CTX);
  assert(r.ok === true && r.auto_remove === false, 'report');
  assert(r.legacy_pipelines_preserved === true, 'legacy preserved');
  assert(r.status.layer === 'runtime-consolidation', 'layer');
}

function main() {
  console.log('Gradual Runtime Consolidation & Legacy Reduction');
  testFlags();
  testRedundancyAnalysis();
  testLegacyAnalysis();
  testDependencyGraph();
  testSimplificationAdvisor();
  testFacadeReport();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
