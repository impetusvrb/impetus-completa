'use strict';

/**
 * npm run test:runtime-operational-calibration
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

function resetPhaseY() {
  delete process.env.IMPETUS_RUNTIME_CALIBRATION;
  delete process.env.IMPETUS_TENANT_STABILIZATION;
  delete process.env.IMPETUS_RUNTIME_TUNING_ADVISOR;
  delete process.env.IMPETUS_PIPELINE_CONSOLIDATION_ANALYSIS;
  process.env.IMPETUS_RUNTIME_CALIBRATION_OBSERVABILITY = 'on';
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/runtimeCalibration/')) delete require.cache[key];
  }
  loadFresh('../../src/runtimeCalibration/runtimeCalibrationTelemetry').resetCalibrationTelemetry();
  loadFresh('../../src/runtimeCalibration/tenantRuntimeState').clearTenantRuntimeState();
}

const STABLE_CTX = {
  operational_density: { runtime_density_score: 0.88 },
  runtime_enrichment: { low_density: false, consolidated_signals: { enrichment_integrity: 0.9 } },
  enrichment_integrity: { enrichment_integrity_score: 0.9 },
  decision_reliability: { runtime_decision_confidence: 0.9 },
  controlled_activation: { readiness: { readiness_ok: true }, rollout_health: 0.85 },
  runtime_stabilization: true,
  semantic_enrichment: { dashboard: { dashboard_usefulness: 0.85 } }
};

const UNSTABLE_CTX = {
  operational_density: { runtime_density_score: 0.45 },
  runtime_enrichment: { low_density: true },
  telemetry_integrity: { gaps_detected: true, gaps: [{ severity: 'critical' }] },
  kpi_governance: { leakage: { detected: true, count: 2 } },
  chat_reasoning_quality: { stable: false }
};

function testStableTenant() {
  console.log('\n=== Stable tenant ===');
  resetPhaseY();
  const eng = loadFresh('../../src/runtimeCalibration/tenantRuntimeCalibrationEngine');
  const r = eng.calibrateTenantRuntime('tenant-stable', { company_id: 'tenant-stable' }, STABLE_CTX);
  assert(r.stabilization.stable === true, 'stable');
  assert(r.critical_tenant === false, 'not critical');
}

function testUnstableTenant() {
  console.log('\n=== Unstable tenant ===');
  resetPhaseY();
  const eng = loadFresh('../../src/runtimeCalibration/tenantRuntimeCalibrationEngine');
  const r = eng.calibrateTenantRuntime('tenant-unstable', {}, UNSTABLE_CTX);
  assert(r.stabilization.stable === false, 'unstable');
  assert(r.gaps.gap_total >= 1, 'gaps');
}

function testOperationalUsefulness() {
  console.log('\n=== Operational usefulness ===');
  resetPhaseY();
  const cal = loadFresh('../../src/runtimeCalibration/operationalUsefulnessCalibration');
  const r = cal.calibrateOperationalUsefulness(STABLE_CTX);
  assert(r.aggregate_operational_usefulness >= 0.75, 'usefulness');
}

function testMaturityScoring() {
  console.log('\n=== Maturity scoring ===');
  resetPhaseY();
  const mat = loadFresh('../../src/runtimeCalibration/runtimeOperationalMaturityEngine');
  const r = mat.computeOperationalMaturity({
    operational_usefulness: { aggregate_operational_usefulness: 0.85 },
    controlled_activation: { readiness: { readiness_ok: true } },
    runtime_stabilization: true
  });
  assert(r.composite_maturity >= 0.7, 'maturity');
}

function testGapConsolidation() {
  console.log('\n=== Gap consolidation ===');
  resetPhaseY();
  const gap = loadFresh('../../src/runtimeCalibration/runtimeGapConsolidator');
  const r = gap.consolidateRuntimeGaps(UNSTABLE_CTX);
  assert(r.gap_total >= 2, 'multiple gaps');
}

function testTuningAdvisor() {
  console.log('\n=== Tuning advisor ===');
  resetPhaseY();
  const adv = loadFresh('../../src/runtimeCalibration/controlledRuntimeTuningAdvisor');
  const r = adv.adviseRuntimeTuning('t1', { stable: false }, { composite_maturity: 0.6 }, { gap_total: 3, gaps: { leakage: [{}] } }, {});
  assert(r.tuning_recommendations.length >= 1, 'recommendations');
  assert(r.auto_apply === false, 'no auto apply');
}

function testPipelineAdvisor() {
  console.log('\n=== Pipeline consolidation ===');
  resetPhaseY();
  const pip = loadFresh('../../src/runtimeCalibration/pipelineConsolidationAdvisor');
  const r = pip.advisePipelineConsolidation({
    precision_delivery: {},
    runtime_enrichment: {},
    contextual_delivery: {},
    runtime_consistency: {},
    runtime_stabilization: {},
    kpi_runtime_stabilization: {}
  });
  assert(r.legacy_pipelines_preserved === true, 'legacy preserved');
  assert(r.auto_remove === false, 'no auto remove');
}

function testRuntimeOscillation() {
  console.log('\n=== Runtime oscillation ===');
  resetPhaseY();
  const state = loadFresh('../../src/runtimeCalibration/tenantRuntimeState');
  const sup = loadFresh('../../src/runtimeCalibration/tenantStabilizationSupervisor');
  for (let i = 0; i < 5; i++) {
    state.recordTenantScore('osc-tenant', 0.5 + (i % 2) * 0.4);
  }
  const r = sup.superviseTenantStabilization('osc-tenant', { maturity: { composite_maturity: 0.7 } });
  assert(r.state.oscillation_count >= 1 || !r.stable, 'oscillation tracked');
}

function testRolloutStabilization() {
  console.log('\n=== Rollout stabilization ===');
  resetPhaseY();
  const facade = loadFresh('../../src/runtimeCalibration/runtimeCalibrationFacade');
  const r = facade.enrichWithRuntimeCalibration({ company_id: 1, functional_axis: 'quality' }, {}, {
    force: true,
    ...STABLE_CTX
  });
  assert(r.rollout_stability?.rollout_stability >= 0.7, 'rollout stability');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseY();
  const facade = loadFresh('../../src/runtimeCalibration/runtimeCalibrationFacade');
  const r = facade.enrichWithRuntimeCalibration(
    { id: 1, company_id: 't1', functional_axis: 'quality' },
    { visible_modules: ['a'] },
    { force: true, ...STABLE_CTX }
  );
  assert(r.runtime_calibration?.phase === 'Y', 'phase Y');
  assert(r.tenant_stabilization != null, 'tenant stabilization');
  assert(r.operational_maturity != null, 'maturity');
  assert(r.runtime_tuning != null, 'tuning');
}

function testFeatureFlags() {
  console.log('\n=== Feature flags ===');
  resetPhaseY();
  const f = loadFresh('../../src/runtimeCalibration/config/phaseYFeatureFlags');
  assert(f.isRuntimeCalibrationEnabled() === false, 'calibration off');
  assert(f.isRuntimeCalibrationObservabilityEnabled() === true, 'observability on');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseY();
  const facade = loadFresh('../../src/runtimeCalibration/runtimeCalibrationFacade');
  for (const [file, ctx] of [
    ['stable-tenant', STABLE_CTX],
    ['unstable-tenant', UNSTABLE_CTX]
  ]) {
    const r = facade.enrichWithRuntimeCalibration(
      { id: 1, company_id: file, functional_axis: 'quality' },
      {},
      { force: true, ...ctx }
    );
    fs.writeFileSync(
      path.join(SNAPSHOT_DIR, `${file}.json`),
      JSON.stringify(
        {
          runtime_calibration: r.runtime_calibration,
          tenant_stabilization: r.tenant_stabilization,
          operational_maturity: r.operational_maturity,
          rollout_stability: r.rollout_stability
        },
        null,
        2
      )
    );
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Runtime Operational Calibration — Phase Y');
  testStableTenant();
  testUnstableTenant();
  testOperationalUsefulness();
  testMaturityScoring();
  testGapConsolidation();
  testTuningAdvisor();
  testPipelineAdvisor();
  testRuntimeOscillation();
  testRolloutStabilization();
  testFacadeObservability();
  testFeatureFlags();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
