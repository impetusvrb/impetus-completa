'use strict';

/**
 * npm run test:enterprise-cognitive-operations
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

function resetPhaseN() {
  delete process.env.IMPETUS_ENTERPRISE_COGNITIVE_OPERATIONS;
  delete process.env.IMPETUS_RUNTIME_ENTROPY_DETECTION;
  delete process.env.IMPETUS_DYNAMIC_CONFIDENCE_ENGINE;
  delete process.env.IMPETUS_COGNITIVE_STABILITY_ENGINE;
  delete process.env.IMPETUS_GOVERNANCE_CALIBRATION;
  process.env.IMPETUS_ENTERPRISE_OPERATIONS_OBSERVABILITY = 'on';
  delete require.cache[require.resolve('../../src/cognitiveOperations/config/phaseNFeatureFlags')];
  loadFresh('../../src/cognitiveOperations/cognitiveOperationalState').resetOperationalState();
  loadFresh('../../src/cognitiveOperations/runtimeStabilityMonitor').clearStabilityHistory();
  loadFresh('../../src/cognitiveOperations/runtimeEntropyTracker').clearEntropyTracker();
  loadFresh('../../src/cognitiveOperations/runtimeConsistencyTracker').clearConsistencyTracker();
  loadFresh('../../src/cognitiveOperations/enterpriseOperationalTelemetry').resetEnterpriseOperationalTelemetry();
}

function testEntropyDetection() {
  console.log('\n=== Entropy detection ===');
  resetPhaseN();
  const det = loadFresh('../../src/cognitiveOperations/cognitiveEntropyDetector');
  const r = det.detectCognitiveEntropy({ fallback_rate: 0.4, cognitive_fragmentation_rate: 0.3, cognitive_consistency_score: 0.5 });
  assert(r.entropy_detected === true, 'entropy detected');
  assert(r.shadow_only === true, 'shadow default');
}

function testStabilityMonitoring() {
  console.log('\n=== Stability monitoring ===');
  const eng = loadFresh('../../src/cognitiveOperations/cognitiveStabilityEngine');
  const r = eng.assessCognitiveStability({ cognitive_consistency_score: 0.95 });
  assert(typeof r.runtime_stability === 'number', 'stability score');
}

function testRuntimeDegradation() {
  console.log('\n=== Runtime degradation ===');
  const eng = loadFresh('../../src/cognitiveOperations/cognitiveStabilityEngine');
  const unstable = eng.assessCognitiveStability({ cognitive_consistency_score: 0.3, composition_oscillation: 0.5 });
  assert(unstable.unstable === true, 'unstable flagged');
}

function testConfidenceInstability() {
  console.log('\n=== Confidence instability ===');
  const conf = loadFresh('../../src/cognitiveOperations/dynamicConfidenceEngine');
  const stable = conf.computeDynamicConfidence({ truth_integrity: 0.95, contextual_integrity: 0.9 });
  const unstable = conf.computeDynamicConfidence({ drift_detected: true, entropy: 0.5, fallback_rate: 0.3, runtime_stability: 0.5 });
  assert(unstable.operational_confidence < stable.operational_confidence, 'confidence drops under stress');
}

function testOperationalMaturity() {
  console.log('\n=== Operational maturity ===');
  const health = loadFresh('../../src/cognitiveOperations/cognitiveHealthMonitor');
  const r = health.computeCognitiveRuntimeHealth({ convergence_health: 0.9, truth_integrity: 0.92, contextual_integrity: 0.88, governance_operational_health: 0.86 });
  assert(r.status === 'healthy', 'healthy status');
}

function testGovernanceSelfEvaluation() {
  console.log('\n=== Governance self evaluation ===');
  const obs = loadFresh('../../src/cognitiveOperations/selfObservingGovernance');
  const r = obs.observeGovernance({ active_layers: 5, entropy: 0.4 });
  assert(r.self_observing === true, 'self observing');
  assert(r.auto_adjust === false, 'no auto adjust');
}

function testAnomalyCorrelation() {
  console.log('\n=== Anomaly correlation ===');
  const corr = loadFresh('../../src/cognitiveOperations/runtimeAnomalyCorrelation');
  const r = corr.correlateRuntimeAnomalies({ drift_detected: true, fallback_rate: 0.2, entropy: 0.4, leakage_count: 1 });
  assert(r.correlated_anomalies.length >= 2, 'multiple anomalies');
  assert(r.correlation_score > 0, 'score positive');
}

function testCalibrationRecommendation() {
  console.log('\n=== Calibration recommendation ===');
  const cal = loadFresh('../../src/cognitiveOperations/governanceCalibrationEngine');
  const r = cal.recommendCalibration({ runtime_entropy_score: 0.5, runtime_stability: 0.6, cognitive_operational_pressure: 0.7 });
  assert(r.recommendations.length > 0, 'has recommendations');
  assert(r.auto_execute === false, 'no auto execute');
}

function testOperationalResilience() {
  console.log('\n=== Operational resilience ===');
  const tel = loadFresh('../../src/cognitiveOperations/enterpriseOperationalTelemetry');
  tel.recordOperationalSample({ runtime_resilience: 0.92 });
  const m = tel.getEnterpriseOperationalTelemetry();
  assert(m.runtime_resilience > 0.8, 'resilience tracked');
}

function testRuntimePressure() {
  console.log('\n=== Runtime pressure ===');
  const coord = loadFresh('../../src/cognitiveOperations/governanceOperationalCoordinator');
  const r = coord.coordinateGovernanceOperations({
    semantic_alignment: {},
    precision_delivery: {},
    cognitive_convergence: {},
    policy_active: true,
    cognitive_operational_pressure: 0.8
  });
  assert(r.overload_risk === true, 'overload risk');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseN();
  const facade = loadFresh('../../src/cognitiveOperations/cognitiveOperationsFacade');
  const { operations } = facade.enrichWithEnterpriseOperations(
    { id: 1, company_id: 2, functional_axis: 'quality' },
    { visible_modules: ['quality'] },
    {
      force: true,
      cognitive_convergence: { cognitive_consistency_score: 0.88, runtime_truth_integrity: 0.9 }
    }
  );
  assert(operations?.phase === 'N', 'phase N block');
  assert(operations?.auto_correct === false, 'no auto correct');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseN();
  const facade = loadFresh('../../src/cognitiveOperations/cognitiveOperationsFacade');
  const personas = [
    ['executive', { functional_axis: 'executive' }, { cognitive_consistency_score: 0.92 }],
    ['hr', { functional_axis: 'hr' }, { cognitive_consistency_score: 0.9 }],
    ['quality', { functional_axis: 'quality' }, { cognitive_consistency_score: 0.91 }],
    ['safety', { functional_axis: 'safety' }, { cognitive_consistency_score: 0.89 }],
    ['environmental', { functional_axis: 'environmental' }, { cognitive_consistency_score: 0.88 }],
    ['operational', { functional_axis: 'operations' }, { cognitive_consistency_score: 0.87 }],
    ['degraded-runtime', { functional_axis: 'quality' }, { cognitive_consistency_score: 0.55, drift: { drift_detected: true } }],
    ['high-drift-runtime', { functional_axis: 'safety' }, { cognitive_consistency_score: 0.6, drift: { drift_detected: true, axis_drift: true } }],
    ['fallback-heavy-runtime', { functional_axis: 'executive' }, { cognitive_consistency_score: 0.65, fragmentation: { cognitive_fragmentation_rate: 0.35 } }]
  ];
  for (const [file, user, convergence] of personas) {
    const ctx = {
      force: true,
      cognitive_convergence: {
        ...convergence,
        runtime_truth_state: { authority: { contextual_truth: { functional_axis: user.functional_axis } } }
      },
      precision_delivery: file.includes('fallback') ? { shadow_comparison: true } : {}
    };
    const { operations } = facade.enrichWithEnterpriseOperations({ id: 1, company_id: 99, ...user }, {}, ctx);
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(operations, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Enterprise Cognitive Operations — Phase N');
  testEntropyDetection();
  testStabilityMonitoring();
  testRuntimeDegradation();
  testConfidenceInstability();
  testOperationalMaturity();
  testGovernanceSelfEvaluation();
  testAnomalyCorrelation();
  testCalibrationRecommendation();
  testOperationalResilience();
  testRuntimePressure();
  testFacadeObservability();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
