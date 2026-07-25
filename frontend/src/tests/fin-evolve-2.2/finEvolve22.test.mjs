/**
 * FIN-EVOLVE-2.2 — Financial Digital Twin Composition tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_EVOLVE_22_PHASE,
  FIN_EVOLVE_22_PRINCIPLE,
  composeFinancialTwinOverlay,
  validateFinancialTwinOverlay
} from '../../domains/finance/twin/overlay/financialTwinOverlay.js';
import {
  provideFinancialTwinState,
  validateFinancialTwinStateProvider,
  projectOperationalTwinNodes,
  joinOperationalToFinanceLinks
} from '../../domains/finance/twin/providers/financialTwinStateProvider.js';
import { runEconomicIntelligence } from '../../domains/finance/economic-engine/economicIntelligenceEngine.js';
import { FINANCE_EVENTS } from '../../domains/finance/observability/financeObservability.js';
import { ASSET_COST_MAP_CONTRACT } from '../../platform/readiness/finance/index.js';
import { assessFinancialTwinReadiness } from '../../platform/readiness/finance-twin/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const FIN = path.join(FE, 'src/domains/finance');
const DOCS = path.join(FE, 'docs/evidence/FIN-EVOLVE-2.2');

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

const sampleEconomicInput = {
  emitEvents: false,
  costsSummary: {
    operational: { per_day: 1200, per_month: 36000 },
    impact_from_events: { last_day: 200 }
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
  projectedImpact: { projected_impact: 400 },
  leakageAlerts: [{ title: 'Vazamento', severity: 'high' }],
  drivers: { units_produced: 100, kwh_consumed: 40 }
};

console.log('FIN-EVOLVE-2.2 — finEvolve22.test\n');

test('principle ONE TWIN · MULTIPLE PERSPECTIVES', () => {
  assert.equal(FIN_EVOLVE_22_PHASE, 'FIN-EVOLVE-2.2');
  assert.equal(FIN_EVOLVE_22_PRINCIPLE, 'ONE TWIN · MULTIPLE PERSPECTIVES');
});

test('FIN-TWIN-READY gate still open for composition', () => {
  const a = assessFinancialTwinReadiness();
  assert.equal(a.gate.openFinEvolve22Composition, true);
});

test('financial overlay — nodes from asset_cost_map, no parallel twin', () => {
  const economic = runEconomicIntelligence(sampleEconomicInput);
  const overlay = composeFinancialTwinOverlay(economic, {
    leakageAlerts: sampleEconomicInput.leakageAlerts
  });
  assert.equal(validateFinancialTwinOverlay(overlay).valid, true);
  assert.equal(overlay.parallelTwin, false);
  assert.ok(overlay.nodes.length >= 1);
  assert.ok(overlay.contractsUsed.includes(ASSET_COST_MAP_CONTRACT.id));
  const node = overlay.nodes[0];
  assert.ok(node.financial);
  assert.ok(node.financial.operational_risk);
  assert.ok(node.evidence.contracts.includes(ASSET_COST_MAP_CONTRACT.id));
});

test('provider — Twin + Economic → Financial Twin State without persistence', () => {
  const state = provideFinancialTwinState({
    ...sampleEconomicInput,
    industrialTwinState: {
      linhas: [
        {
          id: 'line:A',
          maquinas: [{ id: 'eq:press-01', name: 'Prensa 01', status: 'running' }]
        }
      ]
    }
  });
  const v = validateFinancialTwinStateProvider(state);
  assert.equal(v.valid, true, v.issues.join('; '));
  assert.equal(state.parallelTwin, false);
  assert.equal(state.persistence, false);
  assert.equal(state.storage, null);
  assert.ok(state.financeViewPath.includes('/app/finance/twin'));
  assert.ok(state.industrialTwinDeepLink.includes('digital-twin'));
  assert.ok(state.liveQty.available);
});

test('operational projection + join', () => {
  const ops = projectOperationalTwinNodes({
    linhas: [{ id: 'L1', maquinas: [{ id: 'eq:press-01', name: 'P1' }] }]
  });
  assert.equal(ops.length, 1);
  const economic = runEconomicIntelligence(sampleEconomicInput);
  const overlay = composeFinancialTwinOverlay(economic);
  const joined = joinOperationalToFinanceLinks(ops, overlay.nodes);
  assert.ok(joined.some((n) => n.operational));
  assert.ok(joined.some((n) => n.operational?.joined === true));
});

test('observability twin events', () => {
  assert.equal(FINANCE_EVENTS.TWIN_OPENED, 'finance.twin.opened');
  assert.equal(FINANCE_EVENTS.TWIN_OVERLAY_LOADED, 'finance.twin.overlay.loaded');
  assert.equal(FINANCE_EVENTS.TWIN_NODE_SELECTED, 'finance.twin.node.selected');
  assert.equal(FINANCE_EVENTS.TWIN_FINANCIAL_STATE_UPDATED, 'finance.twin.financial_state.updated');
});

test('hub + route + view wired', () => {
  const dash = fs.readFileSync(path.join(FIN, 'dashboard/FinanceExecutiveDashboard.jsx'), 'utf8');
  assert.ok(dash.includes('FinanceTwinHubCard'));
  const app = fs.readFileSync(path.join(FE, 'src/App.jsx'), 'utf8');
  assert.ok(app.includes('path="twin"'));
  assert.ok(app.includes('FinanceTwinFinancialView'));
  assert.ok(fs.existsSync(path.join(FIN, 'twin/views/FinanceTwinFinancialView.jsx')));
  assert.ok(fs.existsSync(path.join(FIN, 'twin/views/FinanceTwinHubCard.jsx')));
});

test('no forbidden twin engines / simulators / databases', () => {
  const forbidden = [
    'FinancialDigitalTwinEngine',
    'FinancialTwinRuntime',
    'FinancialTwinSimulator',
    'TwinDatabase',
    'FinanceWhatIfEngine'
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
  walk(path.join(FIN, 'twin'));
});

test('evidence docs', () => {
  for (const doc of [
    'FIN-EVOLVE-2.2-EXECUTIVE-SUMMARY.md',
    'FIN-EVOLVE-2.2-TWIN-OVERLAY.md',
    'FIN-EVOLVE-2.2-FINANCIAL-VIEW.md',
    'FIN-EVOLVE-2.2-PROVIDERS.md',
    'FIN-EVOLVE-2.2-OBSERVABILITY.md',
    'FIN-EVOLVE-2.2-CERTIFICATION.md'
  ]) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
