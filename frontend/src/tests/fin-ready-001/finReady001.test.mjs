/**
 * FIN-READY-001 — Financial Intelligence Readiness tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIN_READY_001_PHASE,
  FIN_READY_001_PRINCIPLE,
  validateDriverModel,
  validateAssetCostMap,
  validateWmsValuation,
  validateFinanceReadyContracts,
  validateFinanceReadyOwnership,
  validateBlockerClosure,
  validateFinanceReady001,
  getFinanceReadyAudit,
  listDriverMappings,
  listAssetCostLinks,
  projectWmsValuation,
  DRIVER_RATE_CONTRACT,
  ASSET_COST_MAP_CONTRACT,
  WMS_VALUATION_CONTRACT,
  BLOCKER_GAPS_CLOSED_BY_READY
} from '../../platform/readiness/finance/index.js';
import { buildGapSummary } from '../../platform/planning/finance-data/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const DOCS = path.join(FE, 'docs/evidence/FIN-READY-001');
const READY = path.join(FE, 'src/platform/readiness/finance');

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

console.log('FIN-READY-001 — finReady001.test\n');

test('principle REMOVE BLOCKERS BEFORE CAPABILITIES', () => {
  assert.equal(FIN_READY_001_PHASE, 'FIN-READY-001');
  assert.equal(FIN_READY_001_PRINCIPLE, 'REMOVE BLOCKERS BEFORE CAPABILITIES');
});

test('driver model — GAP-FD-011 closed, no cost computation', () => {
  assert.equal(DRIVER_RATE_CONTRACT.computesCosts, false);
  assert.equal(DRIVER_RATE_CONTRACT.closesGap, 'GAP-FD-011');
  const v = validateDriverModel();
  assert.equal(v.valid, true, v.issues.join('; '));
  assert.equal(v.gapClosed, true);
  assert.ok(listDriverMappings().length >= 5);
});

test('asset↔cost map — GAP-FD-004 closed, no Twin product', () => {
  assert.equal(ASSET_COST_MAP_CONTRACT.implementsDigitalTwin, false);
  assert.equal(ASSET_COST_MAP_CONTRACT.closesGap, 'GAP-FD-004');
  const v = validateAssetCostMap();
  assert.equal(v.valid, true, v.issues.join('; '));
  assert.ok(listAssetCostLinks().every((l) => l.cost_center_id || l.cost_origin_ref));
});

test('WMS valuation — GAP-FD-003 available, WMS qty untouched', () => {
  assert.equal(WMS_VALUATION_CONTRACT.mutatesWmsOperationalLogic, false);
  assert.equal(WMS_VALUATION_CONTRACT.quantityOwner, 'wms_inventory');
  assert.equal(WMS_VALUATION_CONTRACT.closesGap, 'GAP-FD-003');
  const v = validateWmsValuation();
  assert.equal(v.valid, true, v.issues.join('; '));
  const rows = projectWmsValuation([
    { item_id: 'i1', quantity: 4, metadata: { average_cost: 2.5, lot_cost: 2.6 } }
  ]);
  assert.equal(rows[0].economic_value, 10);
  assert.equal(rows[0].owner, 'finance_wms_valuation');
});

test('contracts integrity', () => {
  const v = validateFinanceReadyContracts();
  assert.equal(v.valid, true, v.issues.join('; '));
  assert.equal(v.contracts, 3);
});

test('ownership certification — no qty duplication', () => {
  const v = validateFinanceReadyOwnership();
  assert.equal(v.valid, true, v.issues.join('; '));
});

test('blocker closure — 3 closed; product gates still closed', () => {
  const b = validateBlockerClosure();
  assert.equal(b.valid, true, b.issues.join('; '));
  assert.deepEqual(b.closed.sort(), ['GAP-FD-003', 'GAP-FD-004', 'GAP-FD-011'].sort());
  assert.equal(b.remainingProductGates.openSmartCosting, false);
  assert.equal(b.remainingProductGates.openFinancialTwin, false);
  assert.equal(BLOCKER_GAPS_CLOSED_BY_READY.length, 3);
});

test('FIN-DATA gates revalidated — blockersCleared', () => {
  const summary = buildGapSummary();
  assert.equal(summary.blockersOpen, 0);
  assert.equal(summary.gate.blockersCleared, true);
  assert.equal(summary.gate.openSmartCosting, false);
  assert.ok(summary.gate.reevaluationEligible['2.1']);
  assert.ok(summary.gate.reevaluationEligible['2.2']);
});

test('full READY-001 audit', () => {
  const v = validateFinanceReady001();
  assert.equal(v.valid, true, v.issues.join('; '));
  const audit = getFinanceReadyAudit();
  assert.equal(audit.scope.createsSmartCosting, false);
  assert.equal(audit.scope.createsFinancialTwin, false);
  assert.equal(audit.scope.infrastructureOnly, true);
});

test('structure + evidence docs', () => {
  for (const dir of ['driver-model', 'asset-cost-map', 'valuation', 'contracts']) {
    assert.ok(fs.existsSync(path.join(READY, dir)), dir);
  }
  const docs = [
    'FIN-READY-001-DRIVER-MODEL.md',
    'FIN-READY-001-ASSET-COST-MAP.md',
    'FIN-READY-001-WMS-VALUATION.md',
    'FIN-READY-001-CONTRACTS.md',
    'FIN-READY-001-READINESS-VALIDATION.md',
    'FIN-READY-001-EXECUTIVE-SUMMARY.md'
  ];
  for (const d of docs) {
    assert.ok(fs.existsSync(path.join(DOCS, d)), d);
  }
});

test('PLATFORM-2026.1 compatibility — release test present', () => {
  assert.ok(fs.existsSync(path.join(FE, 'src/tests/platform-release2026/release.test.mjs')));
});

test('no product engines under readiness/finance', () => {
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else assert.equal(/smartCostingEngine|financialTwinUi|whatIfEngine/i.test(name), false, name);
    }
  };
  walk(READY);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
