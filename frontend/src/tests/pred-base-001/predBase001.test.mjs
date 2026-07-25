/**
 * PRED-BASE-001 — Enterprise Prediction Platform Baseline tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRED_BASE_001_PHASE,
  PRED_BASE_001_PRINCIPLE,
  PRED_BASE_001_SCOPE,
  PRED_BASE_STATUS,
  FORBIDDEN_IN_PRED_BASE_001,
  PLATFORM_PREDICTION_SEMANTIC_LANES,
  PLATFORM_FORECASTING_INVENTORY,
  PLATFORM_HISTORY_ASSESSMENT,
  ENTERPRISE_PREDICTION_CONTRACT,
  PLATFORM_SEMANTIC_LANES_CERTIFICATION,
  PLATFORM_PREDICTION_GOVERNANCE,
  PREDICTION_CONSUMER_MATRIX,
  PRED_BASE_GAPS,
  assessPlatformPredictionReadiness,
  validatePredBase001,
  getPlatformPredictionBaselineAudit,
  getForecastingCapability,
  getPredictionConsumer,
  getPlatformHistory
} from '../../platform/prediction/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const ROOT = path.join(FE, 'src/platform/prediction');
const DOCS = path.join(FE, 'docs/evidence/PRED-BASE-001');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

console.log('PRED-BASE-001 — predBase001.test\n');

test('principle PREDICTION IS A PLATFORM CAPABILITY + read-only', () => {
  assert.equal(PRED_BASE_001_PHASE, 'PRED-BASE-001');
  assert.equal(PRED_BASE_001_PRINCIPLE, 'PREDICTION IS A PLATFORM CAPABILITY');
  assert.equal(PRED_BASE_001_SCOPE.readOnly, true);
  assert.equal(PRED_BASE_001_SCOPE.platformLevel, true);
  assert.equal(PRED_BASE_001_SCOPE.implementsMachineLearning, false);
  assert.equal(PRED_BASE_001_SCOPE.implementsDomainPrediction, false);
  assert.ok(FORBIDDEN_IN_PRED_BASE_001.includes('domain_specific_prediction_engine'));
  assert.ok(FORBIDDEN_IN_PRED_BASE_001.includes('finance_only_forecast_fork'));
});

test('inventory — forecasting / twin / cognitive / energy classified', () => {
  assert.ok(PLATFORM_FORECASTING_INVENTORY.length >= 12);
  assert.equal(
    getForecastingCapability('operational_forecasting_service').readiness,
    PRED_BASE_STATUS.READY
  );
  assert.equal(
    getForecastingCapability('energy_history_certified').readiness,
    PRED_BASE_STATUS.NOT_AVAILABLE
  );
  assert.equal(
    getForecastingCapability('cpl_cognitive_platform').readiness,
    PRED_BASE_STATUS.READY
  );
});

test('history assessment — energy NOT_AVAILABLE, owners present', () => {
  assert.ok(PLATFORM_HISTORY_ASSESSMENT.length >= 6);
  assert.equal(getPlatformHistory('hist-energy').readiness, PRED_BASE_STATUS.NOT_AVAILABLE);
  assert.equal(getPlatformHistory('hist-energy').mapsToFinGap, 'GAP-PRED-003');
  for (const h of PLATFORM_HISTORY_ASSESSMENT) {
    assert.ok(h.owner, h.id);
  }
});

test('enterprise prediction contract — no model, full I/O', () => {
  assert.equal(ENTERPRISE_PREDICTION_CONTRACT.implementsModel, false);
  assert.equal(ENTERPRISE_PREDICTION_CONTRACT.algorithm, null);
  assert.ok(ENTERPRISE_PREDICTION_CONTRACT.input.length >= 5);
  assert.ok(ENTERPRISE_PREDICTION_CONTRACT.output.length >= 8);
  assert.equal(ENTERPRISE_PREDICTION_CONTRACT.confidence.forbidSilentPointEstimate, true);
});

test('semantic lanes certified — three lanes', () => {
  assert.equal(PLATFORM_SEMANTIC_LANES_CERTIFICATION.certified, true);
  assert.equal(PLATFORM_SEMANTIC_LANES_CERTIFICATION.lanes.length, 3);
  assert.equal(PLATFORM_PREDICTION_SEMANTIC_LANES.OBSERVED_FACT, 'observed_fact');
  assert.equal(PLATFORM_PREDICTION_SEMANTIC_LANES.SIMULATED_SCENARIO, 'simulated_scenario');
  assert.equal(PLATFORM_PREDICTION_SEMANTIC_LANES.FORECAST_PREDICTION, 'forecast_prediction');
  const sim = PLATFORM_SEMANTIC_LANES_CERTIFICATION.lanes.find(
    (l) => l.id === 'simulated_scenario'
  );
  assert.equal(sim.mayTrainAsGroundTruth, false);
});

test('consumer matrix — finance + peer domains', () => {
  assert.ok(PREDICTION_CONSUMER_MATRIX.length >= 6);
  const finance = getPredictionConsumer('finance');
  assert.ok(finance);
  assert.equal(finance.futureProduct, 'FIN-EVOLVE-2.4');
  assert.ok(!finance.blockedBy.includes('GAP-PB-005'));
  assert.ok(finance.coverageDeferred.includes('GAP-PB-003'));
  for (const d of ['maintenance', 'production', 'logistics', 'quality', 'environment']) {
    assert.ok(getPredictionConsumer(d), d);
  }
});

test('governance forbids domain forks', () => {
  assert.equal(PLATFORM_PREDICTION_GOVERNANCE.implementsEngine, false);
  assert.ok(PLATFORM_PREDICTION_GOVERNANCE.forbidden.includes('domain_prediction_fork'));
  assert.ok(PLATFORM_PREDICTION_GOVERNANCE.forbidden.includes('finance_only_ml_engine'));
});

test('gaps — PB-005 closed by 002; PB-003 PARTIAL coverage; reject Finance-only MVP', () => {
  assert.ok(PRED_BASE_GAPS.length >= 5);
  const a = assessPlatformPredictionReadiness();
  assert.equal(a.overall, PRED_BASE_STATUS.PARTIAL);
  assert.equal(a.gate.openFinEvolve24, false);
  assert.equal(a.gate.openDomainPredictionProducts, false);
  assert.equal(a.gate.openEnterprisePredictionConsumers, false);
  assert.equal(a.gate.deferGateTo, 'PRED-BASE-002');
  assert.equal(a.architectureDecision.rejectFinanceOnlyMvp, true);
  assert.equal(a.gapPb005Status, PRED_BASE_STATUS.READY);
  assert.equal(a.gapPb005ClosedBy, 'PRED-BASE-002');
  assert.equal(a.gapPb003Status, PRED_BASE_STATUS.PARTIAL);
  assert.ok(!a.blockedGaps.includes('GAP-PB-005'));
  assert.ok(!a.blockedGaps.includes('GAP-PB-003'));
  assert.ok(a.gate.contractsFormalized);
  assert.ok(a.gate.semanticLanesCertified);
});

test('full validation + audit', () => {
  const v = validatePredBase001();
  assert.equal(v.valid, true, v.issues.join('; '));
  const audit = getPlatformPredictionBaselineAudit();
  assert.equal(audit.scope.readOnly, true);
  assert.ok(audit.next.stillClosed.includes('finance_only_predictive_mvp'));
  assert.ok(audit.next.resolveFirst.some((x) => String(x).includes('PRED-BASE-002')));
});

test('no predictive models / ML under platform/prediction', () => {
  const forbidden = [
    'PredictionEngine',
    'trainModel(',
    'tensorflow',
    'sklearn',
    'MachineLearningModel',
    'GenerativeAI'
  ];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(js|mjs)$/.test(name)) {
        const t = fs.readFileSync(p, 'utf8');
        for (const f of forbidden) assert.ok(!t.includes(f), `${name} has ${f}`);
      }
    }
  };
  walk(ROOT);
});

test('PLATFORM-2026.1 release test still present', () => {
  assert.ok(fs.existsSync(path.join(FE, 'src/tests/platform-release2026/release.test.mjs')));
});

test('structure + evidence docs', () => {
  for (const dir of [
    'inventory',
    'contracts',
    'governance',
    'history',
    'consumers',
    'readiness',
    'api'
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, dir)), dir);
  }
  for (const doc of [
    'PRED-BASE-001-EXECUTIVE-SUMMARY.md',
    'PRED-BASE-001-INVENTORY.md',
    'PRED-BASE-001-HISTORY.md',
    'PRED-BASE-001-CONTRACTS.md',
    'PRED-BASE-001-LANES.md',
    'PRED-BASE-001-CONSUMERS.md',
    'PRED-BASE-001-GAPS.md'
  ]) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
