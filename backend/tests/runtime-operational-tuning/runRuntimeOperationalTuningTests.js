'use strict';

/**
 * npm run test:runtime-operational-tuning
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

function resetTuning() {
  delete process.env.IMPETUS_OPERATIONAL_RUNTIME_TUNING;
  delete process.env.IMPETUS_RUNTIME_TUNING_ADVISOR;
  process.env.IMPETUS_RUNTIME_TUNING_OBSERVABILITY = 'on';
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/runtimeTuning/')) delete require.cache[key];
  }
  loadFresh('../../src/runtimeTuning/runtimeTuningTelemetry').resetRuntimeTuningTelemetry();
}

const PRESSURE_CTX = {
  tenant_id: 't-pressure',
  runtime_calibration: { gap_total: 5 },
  runtime_enrichment: {},
  precision_delivery: {},
  contextual_delivery: {},
  runtime_consistency: {},
  tenant_stabilization: { stable: false },
  tenant_rollout: { active_channels: ['kpi', 'summary'] },
  operational_maturity: { composite_maturity: 0.6 }
};

function testFlags() {
  console.log('\n=== Feature flags ===');
  resetTuning();
  const f = loadFresh('../../src/runtimeTuning/config/runtimeTuningFeatureFlags');
  assert(f.isOperationalRuntimeTuningEnabled() === false, 'tuning off');
  assert(f.isRuntimeTuningObservabilityEnabled() === true, 'obs on');
}

function testPressure() {
  console.log('\n=== Runtime pressure ===');
  resetTuning();
  const p = loadFresh('../../src/runtimeTuning/runtimePressureAnalyzer');
  const r = p.analyzeRuntimePressure(PRESSURE_CTX);
  assert(r.runtime_pressure === true, 'pressure detected');
  assert(r.auto_remediate === false, 'no auto remediate');
}

function testDeliveryOptimization() {
  console.log('\n=== Delivery optimization ===');
  resetTuning();
  const d = loadFresh('../../src/runtimeTuning/deliveryOptimizationAdvisor');
  const r = d.adviseDeliveryOptimization({
    kpi_governance: { leakage: { detected: true } },
    kpi_hierarchy_delivery_integrity: { stable: false }
  });
  assert(r.delivery_recommendations.length >= 1, 'recommendations');
  assert(r.auto_apply === false, 'no auto apply');
}

function testEnrichmentOptimization() {
  console.log('\n=== Enrichment optimization ===');
  resetTuning();
  const e = loadFresh('../../src/runtimeTuning/enrichmentOptimizationAdvisor');
  const r = e.adviseEnrichmentOptimization({
    telemetry_integrity: { gaps_detected: true, gaps: [{ severity: 'high' }] },
    runtime_enrichment: { low_density: true },
    enrichment_integrity: { enrichment_integrity_score: 0.5 }
  });
  assert(r.issue_total >= 2, 'issues found');
  assert(r.auto_apply === false, 'no auto apply');
}

function testEfficiency() {
  console.log('\n=== Runtime efficiency ===');
  resetTuning();
  const eff = loadFresh('../../src/runtimeTuning/runtimeEfficiencySupervisor');
  const r = eff.superviseRuntimeEfficiency({
    runtime_enrichment: {},
    precision_delivery: {},
    contextual_delivery: {},
    operational_usefulness: { aggregate_operational_usefulness: 0.55 }
  });
  assert(r.efficiency_score < 0.72, 'low efficiency');
  assert(r.auto_apply === false, 'supervised');
}

function testOperationalTuning() {
  console.log('\n=== Operational tuning aggregate ===');
  resetTuning();
  const tun = loadFresh('../../src/runtimeTuning/runtimeOperationalTuning');
  const r = tun.generateOperationalTuning(PRESSURE_CTX);
  assert(r.tuning_recommendations.length >= 1, 'tuning recs');
  assert(r.auto_apply === false && r.auto_remediate === false, 'recommendation only');
  assert(r.recommendation_only === true, 'flag');
}

function testFacadeReport() {
  console.log('\n=== Facade report ===');
  resetTuning();
  const facade = loadFresh('../../src/runtimeTuning/runtimeTuningFacade');
  const r = facade.getRuntimeTuningReport({ tenant_id: 't1', force: true });
  assert(r.ok === true && r.auto_apply === false, 'report ok');
  assert(r.status.layer === 'operational-runtime-tuning', 'layer');
}

function main() {
  console.log('Operational Runtime Tuning & Cognitive Optimization');
  testFlags();
  testPressure();
  testDeliveryOptimization();
  testEnrichmentOptimization();
  testEfficiency();
  testOperationalTuning();
  testFacadeReport();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
