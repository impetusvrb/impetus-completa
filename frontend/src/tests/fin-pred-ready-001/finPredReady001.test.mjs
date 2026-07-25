/**
 * FIN-PRED-READY-001 — Predictive Readiness & Governance tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_PRED_READY_001_PHASE,
  FIN_PRED_READY_001_PRINCIPLE,
  FIN_PRED_READY_001_SCOPE,
  PRED_READY_STATUS,
  FORBIDDEN_IN_PRED_READY_001,
  PREDICTION_SEMANTIC_LANES,
  PREDICTABLE_CAPABILITY_INVENTORY,
  FINANCE_HISTORY_ASSESSMENT,
  FORECAST_TARGET_MATRIX,
  PREDICTION_CONFIDENCE_CONTRACT,
  PREDICTION_EXPLAINABILITY_REQUIREMENTS,
  PREDICTION_GOVERNANCE,
  PREDICTION_LANE_CONTRACT,
  PRED_READY_GAPS,
  assessFinancePredictionReadiness,
  validateFinPredReady001,
  getFinancePredictionReadyAudit,
  getPredictableCapability,
  getForecastTarget
} from '../../platform/readiness/finance-prediction/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const ROOT = path.join(FE, 'src/platform/readiness/finance-prediction');
const DOCS = path.join(FE, 'docs/evidence/FIN-PRED-READY-001');

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

console.log('FIN-PRED-READY-001 — finPredReady001.test\n');

test('principle PREDICT WITHOUT DECIDING + read-only scope', () => {
  assert.equal(FIN_PRED_READY_001_PHASE, 'FIN-PRED-READY-001');
  assert.equal(FIN_PRED_READY_001_PRINCIPLE, 'PREDICT WITHOUT DECIDING');
  assert.equal(FIN_PRED_READY_001_SCOPE.implementsPrediction, false);
  assert.equal(FIN_PRED_READY_001_SCOPE.implementsMachineLearning, false);
  assert.equal(FIN_PRED_READY_001_SCOPE.implementsGenerativeAi, false);
  assert.equal(FIN_PRED_READY_001_SCOPE.readOnly, true);
  assert.ok(FORBIDDEN_IN_PRED_READY_001.includes('machine_learning'));
});

test('inventory — required capabilities classified', () => {
  assert.ok(PREDICTABLE_CAPABILITY_INVENTORY.length >= 9);
  for (const id of [
    'smart_costing',
    'economic_performance',
    'financial_leakage',
    'wms_valuation',
    'energy',
    'production',
    'asset_utilization',
    'financial_drivers',
    'financial_rates'
  ]) {
    const c = getPredictableCapability(id);
    assert.ok(c, id);
    assert.ok(Object.values(PRED_READY_STATUS).includes(c.readiness), id);
  }
});

test('history assessment — temporal fields present, no mutation APIs', () => {
  assert.ok(FINANCE_HISTORY_ASSESSMENT.length >= 7);
  for (const h of FINANCE_HISTORY_ASSESSMENT) {
    assert.ok(h.periodAvailable, h.id);
    assert.ok(h.updateFrequency, h.id);
    assert.ok(h.readiness, h.id);
  }
  const blob = fs
    .readdirSync(path.join(ROOT, 'history'))
    .filter((n) => n.endsWith('.js'))
    .map((n) => fs.readFileSync(path.join(ROOT, 'history', n), 'utf8'))
    .join('\n');
  assert.ok(!blob.includes('UPDATE ') && !blob.includes('INSERT '));
});

test('forecast target matrix — six official indicators', () => {
  assert.ok(FORECAST_TARGET_MATRIX.length >= 6);
  for (const ind of [
    'custo_total',
    'custo_unitario',
    'valuation',
    'leakage',
    'consumo_energetico',
    'eficiencia_economica'
  ]) {
    assert.ok(FORECAST_TARGET_MATRIX.some((t) => t.indicator === ind), ind);
  }
  const energy = getForecastTarget('ft-energy');
  assert.equal(energy.readiness, PRED_READY_STATUS.NOT_READY);
});

test('confidence contract — spec only, full explainability', () => {
  assert.equal(PREDICTION_CONFIDENCE_CONTRACT.computesConfidence, false);
  assert.equal(PREDICTION_CONFIDENCE_CONTRACT.algorithm, null);
  assert.deepEqual(PREDICTION_CONFIDENCE_CONTRACT.chain, [
    'prediction',
    'confidence',
    'evidence',
    'explanation'
  ]);
  assert.ok(PREDICTION_EXPLAINABILITY_REQUIREMENTS.length >= 6);
  assert.equal(PREDICTION_CONFIDENCE_CONTRACT.uncertaintyRepresentation.forbidSilentPointEstimate, true);
});

test('governance documented — predict without deciding', () => {
  assert.equal(PREDICTION_GOVERNANCE.implementsEngine, false);
  assert.ok(PREDICTION_GOVERNANCE.rules.length >= 8);
  assert.ok(PREDICTION_GOVERNANCE.forbiddenActions.includes('auto_decision'));
  assert.ok(PREDICTION_GOVERNANCE.forbiddenActions.includes('auto_execution'));
  assert.ok(
    PREDICTION_GOVERNANCE.rules.some((r) => r.topic === 'previsto_vs_realizado')
  );
});

test('semantic lanes — fact vs simulated vs forecast', () => {
  assert.equal(PREDICTION_LANE_CONTRACT.lanes.length, 3);
  assert.equal(PREDICTION_SEMANTIC_LANES.OBSERVED_FACT, 'observed_fact');
  assert.equal(PREDICTION_SEMANTIC_LANES.SIMULATED_SCENARIO, 'simulated_scenario');
  assert.equal(PREDICTION_SEMANTIC_LANES.FORECAST_PREDICTION, 'forecast_prediction');
  const sim = PREDICTION_LANE_CONTRACT.lanes.find(
    (l) => l.id === PREDICTION_SEMANTIC_LANES.SIMULATED_SCENARIO
  );
  assert.equal(sim.mayTrainAsGroundTruth, false);
});

test('gaps classified + 2.4 gate closed', () => {
  assert.ok(PRED_READY_GAPS.length >= 5);
  const a = assessFinancePredictionReadiness();
  assert.equal(a.overall, PRED_READY_STATUS.PARTIAL);
  assert.equal(a.gate.openFinEvolve24Prediction, false);
  assert.equal(a.gate.openFinEvolve24, false);
  assert.equal(a.gate.confidenceContractReady, true);
  assert.equal(a.gate.governanceReady, true);
  assert.ok(a.blockedGaps.includes('GAP-PRED-003'));
  assert.ok(a.blockedGaps.includes('GAP-PRED-005'));
  assert.equal(a.whatStillMissing.previsao_energetica, PRED_READY_STATUS.BLOCKED);
});

test('full validation + audit read-only', () => {
  const v = validateFinPredReady001();
  assert.equal(v.valid, true, v.issues.join('; '));
  const audit = getFinancePredictionReadyAudit();
  assert.equal(audit.scope.readOnly, true);
  assert.ok(audit.next.stillClosed.includes('prediction_product'));
});

test('no prediction / ML / AI engines under finance-prediction', () => {
  const forbidden = [
    'PredictionEngine',
    'MachineLearningModel',
    'GenerativeAI',
    'AutoOptimizer',
    'trainModel(',
    'tensorflow',
    'sklearn'
  ];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(js|jsx|mjs)$/.test(name)) {
        const t = fs.readFileSync(p, 'utf8');
        for (const f of forbidden) assert.ok(!t.includes(f), `${name} has ${f}`);
      }
    }
  };
  walk(ROOT);
});

test('does not alter certified 2.1 / 2.2 / 2.3 product modules', () => {
  // readiness module must not import whatif/twin engines for mutation
  const api = fs.readFileSync(path.join(ROOT, 'api/financePredictionReadyApi.js'), 'utf8');
  assert.ok(!api.includes('calculateWhatIfScenario'));
  assert.ok(!api.includes('runEconomicIntelligence('));
  assert.ok(fs.existsSync(path.join(FE, 'src/tests/platform-release2026/release.test.mjs')));
});

test('structure + evidence docs', () => {
  for (const dir of [
    'inventory',
    'history',
    'forecast-targets',
    'confidence',
    'governance',
    'contracts',
    'api',
    'gaps'
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, dir)), dir);
  }
  for (const doc of [
    'FIN-PRED-READY-001-EXECUTIVE-SUMMARY.md',
    'FIN-PRED-READY-001-CAPABILITIES.md',
    'FIN-PRED-READY-001-HISTORY.md',
    'FIN-PRED-READY-001-FORECAST-TARGETS.md',
    'FIN-PRED-READY-001-CONFIDENCE.md',
    'FIN-PRED-READY-001-GOVERNANCE.md',
    'FIN-PRED-READY-001-GAPS.md'
  ]) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
