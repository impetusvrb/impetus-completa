/**
 * FIN-EVOLVE-2.1 — Economic Intelligence Engine tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_EVOLVE_21_PHASE,
  FIN_EVOLVE_21_PRINCIPLE,
  runEconomicIntelligence,
  validateEconomicIntelligenceEngine,
  buildHubKpiOverlay,
  ECONOMIC_ENGINE_TECHNICAL_BACKLOG,
  FORBIDDEN_IN_EVOLVE_21
} from '../../domains/finance/economic-engine/economicIntelligenceEngine.js';
import { applyEconomicIntelligenceToView } from '../../domains/finance/economic-engine/applyEconomicIntelligenceToView.js';
import { runSmartCosting, validateSmartCosting } from '../../domains/finance/smart-costing/smartCosting.js';
import {
  runEconomicPerformance,
  validateEconomicPerformance
} from '../../domains/finance/performance/economicPerformance.js';
import { ECONOMIC_ENGINE_OFFICIAL_CONTRACTS } from '../../domains/finance/contracts/economicEngineContracts.js';
import { FINANCE_EVENTS } from '../../domains/finance/observability/financeObservability.js';
import { composeFinanceExecutiveView } from '../../domains/finance/dashboard/financeExecutiveCompose.js';
import {
  DRIVER_RATE_CONTRACT,
  ASSET_COST_MAP_CONTRACT,
  WMS_VALUATION_CONTRACT
} from '../../platform/readiness/finance/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const FIN = path.join(FE, 'src/domains/finance');
const DOCS = path.join(FE, 'docs/evidence/FIN-EVOLVE-2.1');

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

const sampleInput = {
  emitEvents: false,
  costsSummary: {
    operational: { per_day: 1200, per_month: 36000 },
    impact_from_events: { last_day: 200, last_7d: 900 }
  },
  byOrigin: [
    { label: 'parada', day: 80 },
    { label: 'energia', day: 40 },
    { label: 'producao', day: 100 },
    { label: 'material', day: 50 },
    { label: 'vazamento', day: 30 },
    { label: 'utilizacao', day: 20 }
  ],
  topLoss: { total: 300, origin: 'linha-A' },
  projectedLoss: { projected: 500 },
  projectedImpact: { projected_impact: 400 },
  drivers: { units_produced: 100, kwh_consumed: 50, downtime_hours: 2, material_qty_consumed: 10 }
};

console.log('FIN-EVOLVE-2.1 — finEvolve21.test\n');

test('phase + CALCULATE FROM REGISTERED DATA', () => {
  assert.equal(FIN_EVOLVE_21_PHASE, 'FIN-EVOLVE-2.1');
  assert.equal(FIN_EVOLVE_21_PRINCIPLE, 'CALCULATE FROM REGISTERED DATA');
});

test('official contracts only — READY + costs + leakage', () => {
  const ids = ECONOMIC_ENGINE_OFFICIAL_CONTRACTS.map((c) => c.id);
  assert.ok(ids.includes(DRIVER_RATE_CONTRACT.id));
  assert.ok(ids.includes(ASSET_COST_MAP_CONTRACT.id));
  assert.ok(ids.includes(WMS_VALUATION_CONTRACT.id));
  assert.ok(ids.includes('dashboard.costs'));
  assert.ok(ids.includes('dashboard.financialLeakage'));
});

test('Smart Costing — unit / lot / asset / line / cost center', () => {
  const snap = runEconomicIntelligence(sampleInput);
  const sc = snap.smartCosting;
  assert.equal(validateSmartCosting(sc).valid, true);
  assert.equal(sc.unitCost.value, 12);
  assert.ok(sc.lotCosts.supported);
  assert.ok(sc.byAsset.items.length >= 1);
  assert.ok(sc.byLine.items.length >= 1);
  assert.ok(sc.byCostCenter.items.length >= 1);
  assert.ok(sc.explainable);
  assert.ok(sc.unitCost.evidence.formula);
});

test('Performance Económica — indicators without AI/forecast', () => {
  const snap = runEconomicIntelligence(sampleInput);
  const perf = snap.performance;
  assert.equal(validateEconomicPerformance(perf).valid, true);
  assert.equal(perf.indicators.costReal.value, 1200);
  assert.ok(perf.indicators.economicEfficiency.value != null);
  assert.ok(perf.indicators.economicLosses.value >= 300);
  assert.ok(perf.indicators.consolidatedOperationalCost.value != null);
});

test('Economic Intelligence Engine integrity', () => {
  const v = validateEconomicIntelligenceEngine();
  assert.equal(v.valid, true, v.issues.join('; '));
  assert.equal(v.sample.engine, 'EconomicIntelligenceEngine');
});

test('Hub integration — overlay preserves strip, updates values', () => {
  const composed = composeFinanceExecutiveView(sampleInput);
  const economic = runEconomicIntelligence(sampleInput);
  const enriched = applyEconomicIntelligenceToView(composed, economic);
  assert.equal(enriched.economicEngine, 'EconomicIntelligenceEngine');
  assert.ok(enriched.kpis.length >= composed.kpis.length);
  const unitKpi = enriched.kpis.find((k) => k.id === 'economic_proxy');
  assert.ok(unitKpi?.hint.includes('EconomicIntelligence'));
  assert.ok(enriched.kpis.some((k) => k.id === 'econ_efficiency'));
});

test('observability events Release 2.1', () => {
  assert.equal(FINANCE_EVENTS.SMART_COSTING_CALCULATED, 'finance.smart_costing.calculated');
  assert.equal(FINANCE_EVENTS.PERFORMANCE_UPDATED, 'finance.performance.updated');
  assert.equal(FINANCE_EVENTS.COST_ANALYSIS_COMPLETED, 'finance.cost_analysis.completed');
});

test('technical backlog HIGH — extensible slots', () => {
  assert.ok(ECONOMIC_ENGINE_TECHNICAL_BACKLOG.length >= 3);
  const slots = ECONOMIC_ENGINE_TECHNICAL_BACKLOG.map((b) => b.extensionSlot);
  assert.ok(slots.includes('plantRateProvider'));
  assert.ok(slots.includes('impactApiProvider'));
  assert.ok(slots.includes('kpiAliasNormalizer'));
});

test('extensions — plantRateProvider without breaking contracts', () => {
  const snap = runEconomicIntelligence({
    ...sampleInput,
    byOrigin: [],
    extensions: {
      plantRateProvider: (mapping) => (mapping.mapping_id === 'drv-energy' ? 1.5 : null)
    }
  });
  const energy = snap.smartCosting.driverContributions.contributions.find(
    (c) => c.mapping_id === 'drv-energy'
  );
  assert.equal(energy.rate, 1.5);
  assert.equal(energy.amount, 75); // 50 kwh * 1.5
});

test('forbidden capabilities not in scope', () => {
  for (const f of FORBIDDEN_IN_EVOLVE_21) {
    assert.ok(typeof f === 'string');
  }
  const twin = path.join(FIN, 'economic-engine');
  const blob = fs
    .readdirSync(twin)
    .filter((n) => n.endsWith('.js'))
    .map((n) => fs.readFileSync(path.join(twin, n), 'utf8'))
    .join('\n');
  assert.ok(!blob.includes('FinancialDigitalTwinEngine'));
  assert.ok(!blob.includes('FinanceWhatIfEngine'));
});

test('structure + evidence docs', () => {
  for (const dir of ['economic-engine', 'smart-costing', 'performance', 'calculators']) {
    assert.ok(fs.existsSync(path.join(FIN, dir)), dir);
  }
  for (const doc of [
    'FIN-EVOLVE-2.1-EXECUTIVE-SUMMARY.md',
    'FIN-EVOLVE-2.1-ENGINE.md',
    'FIN-EVOLVE-2.1-SMART-COSTING.md',
    'FIN-EVOLVE-2.1-PERFORMANCE.md',
    'FIN-EVOLVE-2.1-HUB-INTEGRATION.md',
    'FIN-EVOLVE-2.1-TECHNICAL-BACKLOG.md'
  ]) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
  }
});

test('hook wires Economic Intelligence Engine', () => {
  const hook = fs.readFileSync(path.join(FIN, 'dashboard/useFinanceExecutiveDashboard.js'), 'utf8');
  assert.ok(hook.includes('runEconomicIntelligence'));
  assert.ok(hook.includes('applyEconomicIntelligenceToView'));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
