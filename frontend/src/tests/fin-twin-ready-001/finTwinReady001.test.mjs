/**
 * FIN-TWIN-READY-001 — Financial Twin Readiness Assessment tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_TWIN_READY_001_PHASE,
  FIN_TWIN_READY_001_PRINCIPLE,
  TWIN_ENTITY_STATUS,
  TWIN_ENTITY_CATALOG,
  TWIN_RELATIONSHIP_MAP,
  TWIN_CANONICAL_CHAIN,
  TWIN_STATE_ATTRIBUTES,
  TWIN_EVENT_SOURCES,
  assessFinancialTwinReadiness,
  validateFinTwinReady001,
  getFinanceTwinReadyAudit,
  getTwinEntity,
  listEventsAffecting
} from '../../platform/readiness/finance-twin/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const ROOT = path.join(FE, 'src/platform/readiness/finance-twin');
const DOCS = path.join(FE, 'docs/evidence/FIN-TWIN-READY-001');

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

console.log('FIN-TWIN-READY-001 — finTwinReady001.test\n');

test('principle MODEL BEFORE SIMULATE', () => {
  assert.equal(FIN_TWIN_READY_001_PHASE, 'FIN-TWIN-READY-001');
  assert.equal(FIN_TWIN_READY_001_PRINCIPLE, 'MODEL BEFORE SIMULATE');
});

test('entity catalog — required finance twin entities', () => {
  assert.ok(TWIN_ENTITY_CATALOG.length >= 15);
  for (const id of [
    'asset',
    'cost_center',
    'production_line',
    'inventory_stock',
    'inventory_valuation',
    'industrial_cost',
    'financial_leakage',
    'billing',
    'wallet',
    'ledger',
    'energy_consumption',
    'work_order'
  ]) {
    assert.ok(getTwinEntity(id), id);
  }
  assert.equal(
    TWIN_ENTITY_CATALOG.filter((e) => e.availability === TWIN_ENTITY_STATUS.BLOCKED).length,
    0
  );
});

test('relationship map — canonical chain asset→…→performance', () => {
  assert.deepEqual(TWIN_CANONICAL_CHAIN, [
    'asset',
    'production_line',
    'cost_center',
    'industrial_cost',
    'economic_performance'
  ]);
  assert.ok(TWIN_RELATIONSHIP_MAP.length >= 12);
  assert.ok(TWIN_RELATIONSHIP_MAP.some((r) => r.from === 'asset' && r.to === 'production_line'));
  assert.ok(TWIN_RELATIONSHIP_MAP.some((r) => r.from === 'cost_center' && r.to === 'industrial_cost'));
  assert.ok(
    TWIN_RELATIONSHIP_MAP.some((r) => r.from === 'industrial_cost' && r.to === 'economic_performance')
  );
});

test('state model — attributes documented, no new calculations', () => {
  assert.ok(TWIN_STATE_ATTRIBUTES.length >= 8);
  for (const a of TWIN_STATE_ATTRIBUTES) {
    assert.equal(a.computesNew, false, a.id);
  }
  for (const id of ['current_cost', 'losses', 'efficiency', 'valuation', 'financial_impact']) {
    assert.ok(TWIN_STATE_ATTRIBUTES.some((a) => a.id === id), id);
  }
});

test('event sources catalogued', () => {
  assert.ok(TWIN_EVENT_SOURCES.length >= 8);
  assert.ok(listEventsAffecting('inventory_stock').length >= 1);
  assert.ok(listEventsAffecting('industrial_cost').some((e) => e.id === 'evt-cost-upsert'));
});

test('readiness — READY for 2.2 composition; what-if/prediction closed', () => {
  const a = assessFinancialTwinReadiness();
  assert.equal(a.overall, TWIN_ENTITY_STATUS.READY);
  assert.equal(a.gate.openFinEvolve22Composition, true);
  assert.equal(a.gate.openWhatIf, false);
  assert.equal(a.gate.openPrediction, false);
  assert.equal(a.blockers.entities.length, 0);
  assert.ok(a.contractsAttending.includes('finance.asset_cost_map.v1'));
  assert.ok(a.contractsAttending.includes('FIN-EVOLVE-2.1 EconomicIntelligenceEngine'));
});

test('full validation + audit read-only scope', () => {
  const v = validateFinTwinReady001();
  assert.equal(v.valid, true, v.issues.join('; '));
  const audit = getFinanceTwinReadyAudit();
  assert.equal(audit.scope.implementsTwin, false);
  assert.equal(audit.scope.newEngines, false);
  assert.equal(audit.scope.readOnly, true);
});

test('structure + evidence docs', () => {
  for (const dir of [
    'entityCatalog',
    'relationshipMap',
    'stateModel',
    'eventSources',
    'readiness',
    'api'
  ]) {
    assert.ok(fs.existsSync(path.join(ROOT, dir)), dir);
  }
  for (const doc of [
    'FIN-TWIN-READY-001-ENTITY-CATALOG.md',
    'FIN-TWIN-READY-001-RELATIONSHIP-MAP.md',
    'FIN-TWIN-READY-001-STATE-MODEL.md',
    'FIN-TWIN-READY-001-EVENT-SOURCES.md',
    'FIN-TWIN-READY-001-READINESS.md',
    'FIN-TWIN-READY-001-EXECUTIVE-SUMMARY.md'
  ]) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
  }
});

test('no Twin product engines under finance-twin', () => {
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else {
        assert.equal(/FinancialDigitalTwinEngine|TwinSimulator|WhatIfEngine/i.test(name), false, name);
        if (/\.js$/.test(name)) {
          const t = fs.readFileSync(p, 'utf8');
          assert.ok(!t.includes('FinancialDigitalTwinEngine'), name);
        }
      }
    }
  };
  walk(ROOT);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
