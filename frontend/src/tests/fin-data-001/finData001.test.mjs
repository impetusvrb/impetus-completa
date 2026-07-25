/**
 * FIN-DATA-001 — Financial Data Readiness certification tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_DATA_001_PHASE,
  FIN_DATA_001_PRINCIPLE,
  FIN_DATA_001_SCOPE,
  DATA_STATUS,
  FINANCE_DATA_SOURCES,
  FINANCE_DATA_OWNERSHIP,
  FINANCE_KPI_MATRIX,
  FINANCE_INSIGHT_MAPPING,
  FINANCE_DATA_GAPS,
  DIGITAL_TWIN_READINESS,
  SMART_COSTING_READINESS,
  PREDICTIVE_READINESS,
  READINESS_LEVEL,
  getFinanceDataAudit,
  validateFinanceDataPlanning,
  buildGapSummary,
  getDataSource,
  getKpiSource
} from '../../platform/planning/finance-data/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const DOCS = path.join(FE, 'docs/evidence/FIN-DATA-001');
const PLAN = path.join(FE, 'src/platform/planning/finance-data');

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

console.log('FIN-DATA-001 — finData001.test\n');

test('phase + principle DATA BEFORE INTELLIGENCE', () => {
  assert.equal(FIN_DATA_001_PHASE, 'FIN-DATA-001');
  assert.equal(FIN_DATA_001_PRINCIPLE, 'DATA BEFORE INTELLIGENCE');
  assert.equal(FIN_DATA_001_SCOPE.discoveryOnly, true);
  assert.equal(FIN_DATA_001_SCOPE.implementsFeatures, false);
  assert.equal(FIN_DATA_001_SCOPE.createsServices, false);
});

test('inventory — ≥15 sources, unique ids, required owners', () => {
  assert.ok(FINANCE_DATA_SOURCES.length >= 15);
  const ids = new Set();
  for (const s of FINANCE_DATA_SOURCES) {
    assert.ok(s.id && s.ownerDomain && s.status, `incomplete ${s.id}`);
    assert.equal(ids.has(s.id), false, `dup ${s.id}`);
    ids.add(s.id);
  }
  assert.ok(getDataSource('industrial_cost_service'));
  assert.ok(getDataSource('financial_leakage'));
  assert.ok(getDataSource('nexus_billing'));
  assert.ok(getDataSource('wms_inventory'));
  assert.ok(getDataSource('digital_twin'));
});

test('no ownership duplication', () => {
  const infos = new Set();
  for (const row of FINANCE_DATA_OWNERSHIP) {
    assert.equal(row.duplicationForbidden, true);
    assert.equal(infos.has(row.information), false, row.information);
    infos.add(row.information);
    assert.ok(FINANCE_DATA_SOURCES.some((s) => s.id === row.owner), row.owner);
  }
});

test('KPI matrix — official origin for hub KPIs', () => {
  assert.ok(FINANCE_KPI_MATRIX.length >= 8);
  for (const id of ['cost_day', 'top_loss', 'leakage_projected', 'billing_status', 'leakage_alerts']) {
    const k = getKpiSource(id);
    assert.ok(k, `missing ${id}`);
    assert.ok(k.sourceId && k.api);
    assert.ok(Object.values(DATA_STATUS).includes(k.status));
  }
});

test('insight mapping covers insight/alert/recommendation/decision', () => {
  const types = new Set(FINANCE_INSIGHT_MAPPING.map((r) => r.type));
  for (const t of ['insight', 'alert', 'recommendation', 'decision']) {
    assert.ok(types.has(t), t);
  }
});

test('readiness — none claim READY; predictive not_ready', () => {
  assert.notEqual(DIGITAL_TWIN_READINESS.readiness, READINESS_LEVEL.READY);
  assert.notEqual(SMART_COSTING_READINESS.readiness, READINESS_LEVEL.READY);
  assert.equal(PREDICTIVE_READINESS.readiness, READINESS_LEVEL.NOT_READY);
});

test('gap analysis — blockers identified; product gates closed; READY closed blockers', () => {
  assert.ok(FINANCE_DATA_GAPS.length >= 10);
  const summary = buildGapSummary();
  assert.ok(summary.blockers >= 3);
  assert.equal(summary.blockersOpen, 0);
  assert.equal(summary.gate.blockersCleared, true);
  assert.equal(summary.gate.openSmartCosting, false);
  assert.equal(summary.gate.openFinancialTwin, false);
  assert.equal(summary.gate.openPredictive, false);
});

test('planning API audit integrity', () => {
  const v = validateFinanceDataPlanning();
  assert.equal(v.valid, true, v.issues.join('; '));
  const audit = getFinanceDataAudit();
  assert.equal(audit.phase, 'FIN-DATA-001');
  assert.ok(audit.inventory.sources.length >= 15);
  assert.ok(audit.insights.length >= 8);
  assert.ok(audit.nextGate.blocks.some((b) => String(b).includes('FIN-EVOLVE-2.1')));
  assert.ok(audit.nextGate.eligibleForReevaluation?.includes('FIN-EVOLVE-2.1'));
});

test('catalog modules exist (read-only APIs)', () => {
  const files = [
    'financeDataInventory.js',
    'financeDataOwnership.js',
    'financeKpiMatrix.js',
    'financeInsightsMapping.js',
    'financeReadinessMatrix.js',
    'financeGapAnalysis.js',
    'financeDataPlanningApi.js',
    'index.js'
  ];
  for (const f of files) {
    assert.ok(fs.existsSync(path.join(PLAN, f)), f);
  }
});

test('evidence docs — 9 deliverables', () => {
  const docs = [
    'FIN-DATA-001-DATA-SOURCES.md',
    'FIN-DATA-001-KPI-MATRIX.md',
    'FIN-DATA-001-INSIGHTS.md',
    'FIN-DATA-001-DIGITAL-TWIN-READINESS.md',
    'FIN-DATA-001-SMART-COSTING-READINESS.md',
    'FIN-DATA-001-PREDICTIVE-READINESS.md',
    'FIN-DATA-001-DATA-OWNERSHIP.md',
    'FIN-DATA-001-GAP-ANALYSIS.md',
    'FIN-DATA-001-EXECUTIVE-SUMMARY.md'
  ];
  for (const d of docs) {
    const p = path.join(DOCS, d);
    assert.ok(fs.existsSync(p), d);
    assert.ok(fs.readFileSync(p, 'utf8').includes('FIN-DATA-001'), d);
  }
});

test('PLATFORM-2026.1 untouched — release test file present', () => {
  const releaseTest = path.join(FE, 'src/tests/platform-release2026/release.test.mjs');
  assert.ok(fs.existsSync(releaseTest));
});

test('scope — no Smart Costing / Twin product modules under finance-data', () => {
  const listing = fs.readdirSync(PLAN);
  for (const name of listing) {
    assert.equal(/smartCostingEngine|financialTwinEngine|whatIfEngine/i.test(name), false, name);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
