/**
 * FIN-VAL-001 — Finance Operational Validation tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_VAL_001_PHASE,
  FIN_VAL_001_PRINCIPLE,
  FIN_VAL_001_SCOPE,
  FIN_VAL_JOURNEYS,
  FIN_VAL_EXCEPTION_SCENARIOS,
  FIN_VAL_METRIC_THRESHOLDS,
  FIN_VAL_GATE_CRITERIA,
  runFinanceOperationalValidation,
  evaluateFinEvolve23Gate,
  validateFinVal001,
  getFinanceValidationAudit
} from '../../platform/validation/finance/index.js';
import { FINANCE_EVENTS } from '../../domains/finance/observability/financeObservability.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const VAL = path.join(FE, 'src/platform/validation/finance');
const DOCS = path.join(FE, 'docs/evidence/FIN-VAL-001');

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

console.log('FIN-VAL-001 — finVal001.test\n');

test('principle VALIDATE BEFORE EXPAND + validation-only scope', () => {
  assert.equal(FIN_VAL_001_PHASE, 'FIN-VAL-001');
  assert.equal(FIN_VAL_001_PRINCIPLE, 'VALIDATE BEFORE EXPAND');
  assert.equal(FIN_VAL_001_SCOPE.implementsFeatures, false);
  assert.equal(FIN_VAL_001_SCOPE.opensWhatIf, false);
  assert.equal(FIN_VAL_001_SCOPE.opensPrediction, false);
  assert.equal(FIN_VAL_001_SCOPE.validationOnly, true);
});

test('catalogs — journeys, scenarios, metrics, gate', () => {
  assert.ok(FIN_VAL_JOURNEYS.length >= 4);
  assert.ok(FIN_VAL_EXCEPTION_SCENARIOS.length >= 5);
  assert.ok(FIN_VAL_GATE_CRITERIA.length >= 7);
  assert.ok(FIN_VAL_METRIC_THRESHOLDS.twin_composition_ms_max <= 250);
  assert.equal(FIN_VAL_METRIC_THRESHOLDS.explainability_coverage_min, 1.0);
});

test('harness PASS + gate openFinEvolve23', () => {
  const report = runFinanceOperationalValidation();
  assert.equal(report.status, 'PASS', JSON.stringify(report.findings?.filter((f) => f.status !== 'PASS')));
  assert.equal(report.gate.openFinEvolve23, true);
  assert.equal(report.gate.openWhatIf, true);
  assert.equal(report.gate.openPrediction, false);
  assert.deepEqual(report.gate.failed, []);
  for (const key of [
    'journeys_pass',
    'cost_divergence_ok',
    'performance_ok',
    'observability_ok',
    'explainability_ok',
    'resilience_ok',
    'twin_ok'
  ]) {
    assert.equal(report.metrics[key], true, key);
  }
});

test('validateFinVal001 + audit API', () => {
  const v = validateFinVal001();
  assert.equal(v.valid, true, v.issues.join('; '));
  const audit = getFinanceValidationAudit();
  assert.equal(audit.phase, 'FIN-VAL-001');
  assert.equal(audit.report.status, 'PASS');
  assert.ok(audit.next.ifPass.includes('2.3'));
  assert.ok(audit.next.stillClosed.includes('prediction'));
});

test('gate HOLD when metrics fail', () => {
  const hold = evaluateFinEvolve23Gate({ journeys_pass: false });
  assert.equal(hold.openFinEvolve23, false);
  assert.ok(hold.failed.includes('G-FIN-001'));
  assert.ok(hold.verdict.startsWith('HOLD'));
});

test('observability events present in FINANCE_EVENTS values', () => {
  const values = new Set(Object.values(FINANCE_EVENTS));
  const required = [
    'finance.dashboard.loaded',
    'finance.smart_costing.calculated',
    'finance.twin.opened',
    'finance.twin.financial_state.updated'
  ];
  for (const ev of required) assert.ok(values.has(ev), ev);
});

test('no What-if / prediction product engines under validation/', () => {
  const forbidden = [
    'FinanceWhatIfEngine',
    'WhatIfSimulator',
    'PredictionEngine',
    'FinancialTwinSimulator'
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
  walk(VAL);
});

test('evidence docs', () => {
  for (const doc of [
    'FIN-VAL-001-EXECUTIVE-SUMMARY.md',
    'FIN-VAL-001-JOURNEYS.md',
    'FIN-VAL-001-SCENARIOS.md',
    'FIN-VAL-001-METRICS.md',
    'FIN-VAL-001-GATE.md',
    'FIN-VAL-001-CERTIFICATION.md'
  ]) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
