/**
 * FIN-EVOLVE-2.3 — Financial What-if Analysis tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_EVOLVE_23_PHASE,
  FIN_EVOLVE_23_PRINCIPLE,
  FIN_EVOLVE_23_SCOPE,
  FORBIDDEN_IN_EVOLVE_23
} from '../../domains/finance/whatif/scenario-engine/whatIfConstants.js';
import {
  WHATIF_VARIABLES,
  validateWhatIfVariablesCatalog
} from '../../domains/finance/whatif/scenario-engine/whatIfVariables.js';
import { applyHypotheses } from '../../domains/finance/whatif/scenario-engine/applyHypotheses.js';
import {
  createWhatIfScenario,
  setWhatIfParameter,
  calculateWhatIfScenario,
  discardWhatIfScenario,
  clearAllWhatIfScenarios,
  getWhatIfScenario,
  validateScenarioCompositionEngine
} from '../../domains/finance/whatif/scenario-engine/scenarioCompositionEngine.js';
import {
  compareEconomicImpact,
  validateEconomicImpactComparison
} from '../../domains/finance/whatif/comparison/economicImpactComparison.js';
import {
  provideWhatIfSession,
  validateWhatIfProvider
} from '../../domains/finance/whatif/providers/whatIfScenarioProvider.js';
import {
  WHATIF_OBSERVABILITY_EVENTS,
  validateWhatIfObservability
} from '../../domains/finance/whatif/observability/whatIfObservability.js';
import { FINANCE_EVENTS } from '../../domains/finance/observability/financeObservability.js';
import { runEconomicIntelligence } from '../../domains/finance/economic-engine/economicIntelligenceEngine.js';
import { evaluateFinEvolve23Gate } from '../../platform/validation/finance/gate/finValGate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const FIN = path.join(FE, 'src/domains/finance');
const WIF = path.join(FIN, 'whatif');
const DOCS = path.join(FE, 'docs/evidence/FIN-EVOLVE-2.3');

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

const sampleBaseline = {
  costsSummary: {
    operational: { per_day: 1200, per_month: 36000 },
    impact_from_events: { last_day: 150 }
  },
  byOrigin: [
    { label: 'parada', day: 80 },
    { label: 'energia', day: 40 },
    { label: 'producao', day: 100 }
  ],
  topLoss: { total: 300, origin: 'linha-A' },
  projectedImpact: { projected_impact: 400 },
  leakageAlerts: [{ title: 'Vazamento', severity: 'high' }],
  drivers: { units_produced: 100, kwh_consumed: 40, utilization_ratio: 1 }
};

console.log('FIN-EVOLVE-2.3 — finEvolve23.test\n');

clearAllWhatIfScenarios();

test('principle SIMULATE WITHOUT MUTATING + scope', () => {
  assert.equal(FIN_EVOLVE_23_PHASE, 'FIN-EVOLVE-2.3');
  assert.equal(FIN_EVOLVE_23_PRINCIPLE, 'SIMULATE WITHOUT MUTATING');
  assert.equal(FIN_EVOLVE_23_SCOPE.mutatesOperational, false);
  assert.equal(FIN_EVOLVE_23_SCOPE.prediction, false);
  assert.equal(FIN_EVOLVE_23_SCOPE.persistenceRequired, false);
  assert.ok(FORBIDDEN_IN_EVOLVE_23.includes('prediction'));
});

test('GATE-FIN-EVOLVE-2.3 still open from FIN-VAL-001 metrics', () => {
  const gate = evaluateFinEvolve23Gate({
    journeys_pass: true,
    cost_divergence_ok: true,
    performance_ok: true,
    observability_ok: true,
    explainability_ok: true,
    resilience_ok: true,
    twin_ok: true
  });
  assert.equal(gate.openFinEvolve23, true);
  assert.equal(gate.openPrediction, false);
});

test('supported what-if variables catalog', () => {
  assert.ok(WHATIF_VARIABLES.length >= 7);
  const v = validateWhatIfVariablesCatalog();
  assert.equal(v.valid, true, v.issues.join('; '));
});

test('applyHypotheses never mutates baseline', () => {
  const baseline = JSON.parse(JSON.stringify(sampleBaseline));
  const fp = JSON.stringify(baseline);
  const hypo = applyHypotheses(baseline, {
    production_volume: 50,
    energy_cost: { mode: 'absolute', value: 200 },
    leakage: { projected_impact: 900 }
  });
  assert.equal(JSON.stringify(baseline), fp);
  assert.equal(hypo.baselineUntouched, true);
  assert.ok(hypo.applied.length >= 2);
  assert.equal(hypo.input.drivers.units_produced, 50);
  assert.notEqual(hypo.input.drivers.units_produced, baseline.drivers.units_produced);
});

test('scenario isolation — scenarioId + independent contexts', () => {
  clearAllWhatIfScenarios();
  const a = createWhatIfScenario({
    baselineInput: sampleBaseline,
    label: 'A',
    emitEvents: false
  });
  const b = createWhatIfScenario({
    baselineInput: sampleBaseline,
    label: 'B',
    emitEvents: false
  });
  assert.notEqual(a.scenarioId, b.scenarioId);
  setWhatIfParameter(a.scenarioId, 'production_volume', 50, { emitEvents: false });
  setWhatIfParameter(b.scenarioId, 'production_volume', 200, { emitEvents: false });
  const ra = calculateWhatIfScenario(a.scenarioId, { emitEvents: false });
  const rb = calculateWhatIfScenario(b.scenarioId, { emitEvents: false });
  assert.equal(ra.ok, true);
  assert.equal(rb.ok, true);
  assert.notEqual(ra.scenario.simulatedEconomic.unitCost, rb.scenario.simulatedEconomic.unitCost);
  assert.equal(ra.scenario.isolation.independentContext, true);
  assert.equal(ra.baselineUntouched, true);
  discardWhatIfScenario(a.scenarioId, { emitEvents: false });
  discardWhatIfScenario(b.scenarioId, { emitEvents: false });
  assert.equal(getWhatIfScenario(a.scenarioId), null);
});

test('comparison current vs simulated with explainability', () => {
  clearAllWhatIfScenarios();
  const s = createWhatIfScenario({ baselineInput: sampleBaseline, emitEvents: false });
  setWhatIfParameter(s.scenarioId, 'production_volume', 50, { emitEvents: false });
  const r = calculateWhatIfScenario(s.scenarioId, { emitEvents: false });
  assert.equal(r.ok, true);
  const v = validateEconomicImpactComparison(r.comparison);
  assert.equal(v.valid, true, v.issues.join('; '));
  const unit = r.comparison.metrics.find((m) => m.id === 'unit_cost');
  assert.ok(unit);
  assert.equal(unit.current, 12);
  assert.ok(unit.simulated > unit.current);
  assert.ok(r.comparison.explainability.hypothesesApplied.length >= 1);
  assert.ok(r.comparison.explainability.limitations.length >= 3);
  assert.ok(r.comparison.explainability.contractsUsed.length >= 1);
  assert.equal(r.comparison.mutatesOperational, false);
  discardWhatIfScenario(s.scenarioId, { emitEvents: false });
});

test('provider session from twin/engine consumers', () => {
  clearAllWhatIfScenarios();
  const session = provideWhatIfSession({
    ...sampleBaseline,
    emitEvents: false,
    label: 'provider-test'
  });
  const v = validateWhatIfProvider(session);
  assert.equal(v.valid, true, v.issues.join('; '));
  assert.ok(session.scenarioId);
  assert.equal(session.path, '/app/finance/whatif');
  assert.equal(session.twinPath, '/app/finance/twin');
  discardWhatIfScenario(session.scenarioId, { emitEvents: false });
});

test('observability whatif events', () => {
  const obs = validateWhatIfObservability();
  assert.equal(obs.valid, true, obs.issues.join('; '));
  assert.equal(FINANCE_EVENTS.WHATIF_STARTED, 'finance.whatif.started');
  assert.equal(FINANCE_EVENTS.WHATIF_PARAMETER_CHANGED, 'finance.whatif.parameter.changed');
  assert.equal(FINANCE_EVENTS.WHATIF_CALCULATED, 'finance.whatif.calculated');
  assert.equal(FINANCE_EVENTS.WHATIF_DISCARDED, 'finance.whatif.discarded');
  assert.equal(WHATIF_OBSERVABILITY_EVENTS.length, 4);
});

test('hub + route + view wired', () => {
  const dash = fs.readFileSync(path.join(FIN, 'dashboard/FinanceExecutiveDashboard.jsx'), 'utf8');
  assert.ok(dash.includes('FinanceWhatIfHubCard'));
  const app = fs.readFileSync(path.join(FE, 'src/App.jsx'), 'utf8');
  assert.ok(app.includes('path="whatif"'));
  assert.ok(app.includes('FinanceWhatIfView'));
  assert.ok(fs.existsSync(path.join(WIF, 'scenario-view/FinanceWhatIfView.jsx')));
  assert.ok(fs.existsSync(path.join(WIF, 'scenario-view/FinanceWhatIfHubCard.jsx')));
});

test('forbidden product capabilities not in whatif module', () => {
  const forbidden = [
    'PredictionEngine',
    'GenerativeAI',
    'AutoOptimizationEngine',
    'MachineLearningModel',
    'FinancialTwinSimulator'
  ];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(js|jsx)$/.test(name)) {
        const t = fs.readFileSync(p, 'utf8');
        for (const f of forbidden) assert.ok(!t.includes(f), `${name} has ${f}`);
      }
    }
  };
  walk(WIF);
});

test('engine composition still works as consumer baseline', () => {
  const economic = runEconomicIntelligence({ ...sampleBaseline, emitEvents: false });
  const simulated = runEconomicIntelligence({
    ...sampleBaseline,
    drivers: { ...sampleBaseline.drivers, units_produced: 50 },
    emitEvents: false
  });
  const cmp = compareEconomicImpact(economic, simulated, {
    scenarioId: 'manual',
    hypothesesApplied: [{ key: 'production_volume', value: 50 }],
    contractsUsed: economic.contractsConsumed || []
  });
  assert.equal(validateEconomicImpactComparison(cmp).valid, true);
});

test('structure + evidence docs', () => {
  assert.equal(validateScenarioCompositionEngine().valid, true);
  for (const dir of ['scenario-engine', 'scenario-view', 'comparison', 'providers', 'observability']) {
    assert.ok(fs.existsSync(path.join(WIF, dir)), dir);
  }
  for (const doc of [
    'FIN-EVOLVE-2.3-EXECUTIVE-SUMMARY.md',
    'FIN-EVOLVE-2.3-SCENARIO-ENGINE.md',
    'FIN-EVOLVE-2.3-VARIABLES.md',
    'FIN-EVOLVE-2.3-COMPARISON.md',
    'FIN-EVOLVE-2.3-HUB-INTEGRATION.md',
    'FIN-EVOLVE-2.3-OBSERVABILITY.md',
    'FIN-EVOLVE-2.3-CERTIFICATION.md'
  ]) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
