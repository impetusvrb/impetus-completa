/**
 * FIN-EVOLVE-002 — Release 2.0 certification tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_EVOLVE_002_PHASE,
  FIN_EVOLVE_002_PRINCIPLE,
  composeFinanceExecutiveView,
  validateFinEvolve002Compose
} from '../../domains/finance/dashboard/financeExecutiveCompose.js';
import { FINANCE_EVENTS } from '../../domains/finance/observability/financeObservability.js';
import { FINANCE_DOMAIN_IDENTITY } from '../../domains/finance/metadata/financeDomainMetadata.js';
import { FINANCE_BASE_PATH } from '../../domains/finance/metadata/financeNavigationMetadata.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const DOCS = path.join(FE, 'docs/evidence/FIN-EVOLVE-002');
const FIN = path.join(FE, 'src/domains/finance');

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

console.log('FIN-EVOLVE-002 — finEvolve002.test\n');

test('REUSE COMPOSE DELIVER — phase', () => {
  assert.equal(FIN_EVOLVE_002_PHASE, 'FIN-EVOLVE-002');
  assert.ok(FIN_EVOLVE_002_PRINCIPLE.includes('NEVER REBUILD'));
});

test('compose — KPIs, alerts, insights, decisions', () => {
  const view = composeFinanceExecutiveView({
    costsSummary: {
      operational: { per_day: 1200, per_month: 36000 },
      impact_from_events: { last_day: 400, last_7d: 2000 }
    },
    byOrigin: [{ label: 'Parada', day: 500 }],
    topLoss: { total: 300, origin: 'linha-A' },
    projectedLoss: { projected: 900, hours: 48 },
    leakageAlerts: [{ id: 'a1', title: 'Vazamento crítico', severity: 'high' }],
    leakageRanking: [{ origin: 'setor-B', value: 250 }],
    projectedImpact: { projected_impact: 1100 }
  });
  assert.ok(view.kpis.length >= 6);
  assert.equal(view.alerts.length, 1);
  assert.ok(view.insights.length >= 2);
  assert.ok(view.decisions.length >= 1);
  assert.ok(view.decisions[0].origin);
  assert.ok(view.decisions[0].impact);
  assert.ok(view.decisions[0].priority);
  assert.ok(view.decisions[0].evidence);
  assert.ok(view.executiveSummaryText.includes('Custo operacional'));
  assert.ok(view.byOriginChart.length >= 1);
});

test('compose integrity validator', () => {
  const r = validateFinEvolve002Compose();
  assert.equal(r.valid, true, r.issues.join('; '));
});

test('observability events Release 2.0', () => {
  assert.equal(FINANCE_EVENTS.DASHBOARD_LOADED, 'finance.dashboard.loaded');
  assert.equal(FINANCE_EVENTS.KPI_OPENED, 'finance.kpi.opened');
  assert.equal(FINANCE_EVENTS.ALERT_OPENED, 'finance.alert.opened');
  assert.equal(FINANCE_EVENTS.INSIGHT_CLICKED, 'finance.insight.clicked');
  assert.equal(FINANCE_EVENTS.DECISION_EXECUTED, 'finance.decision.executed');
});

test('navigation — official routes unchanged', () => {
  assert.equal(FINANCE_DOMAIN_IDENTITY.landingRoute, '/app/finance');
  assert.equal(FINANCE_BASE_PATH, '/app/finance');
  const app = fs.readFileSync(path.join(FE, 'src/App.jsx'), 'utf8');
  assert.ok(app.includes('path="/app/finance"'));
  assert.ok(app.includes('path="costs"'));
  assert.ok(app.includes('path="leakage"'));
  assert.ok(app.includes('path="billing"'));
});

test('workspace hub mounts executive dashboard', () => {
  const page = fs.readFileSync(path.join(FIN, 'workspace/FinanceWorkspacePage.jsx'), 'utf8');
  assert.ok(page.includes('FinanceExecutiveDashboard'));
  assert.ok(page.includes('Ferramentas do domínio'));
});

test('structure — dashboard kpis alerts insights decision-panel', () => {
  for (const rel of [
    'dashboard/FinanceExecutiveDashboard.jsx',
    'dashboard/financeExecutiveCompose.js',
    'dashboard/useFinanceExecutiveDashboard.js',
    'kpis/FinanceExecutiveKpis.jsx',
    'alerts/FinanceAlertsPanel.jsx',
    'insights/FinanceInsightsPanel.jsx',
    'decision-panel/FinanceDecisionPanel.jsx'
  ]) {
    assert.ok(fs.existsSync(path.join(FIN, rel)), rel);
  }
});

test('no forbidden Release 2.2+ engines (Twin / What-if)', () => {
  const forbidden = ['FinancialDigitalTwinEngine', 'FinanceWhatIfEngine'];
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
  walk(FIN);
});

test('documentation deliverables', () => {
  for (const doc of [
    'FIN-EVOLVE-002-IMPLEMENTATION.md',
    'FIN-EVOLVE-002-CAPABILITIES.md',
    'FIN-EVOLVE-002-OBSERVABILITY.md',
    'FIN-EVOLVE-002-CERTIFICATION.md',
    'FIN-EVOLVE-002-EXECUTIVE-SUMMARY.md'
  ]) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
  }
});

console.log(`\nFIN-EVOLVE-002: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
