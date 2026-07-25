/**
 * OPM-001C — Warehouse Operations (Safe Transaction Layer) tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessWarehouseOperation, WAREHOUSE_OPS } from '../../domains/logistics-operational/modules/warehouse/warehouseOperationsGuard.js';
import { getWarehouseGapMatrix, WAREHOUSE_OPERATION_GAPS } from '../../domains/logistics-operational/modules/warehouse/warehouseGapRegistry.js';
import { groupMovementsByType } from '../../domains/logistics-operational/modules/warehouse/warehouseTimelineUtils.js';
import { sanitizeOperationalDetail } from '../../domains/logistics-operational/modules/warehouse/warehouseOperationalMessages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const WH = path.join(FE, 'src/domains/logistics-operational/modules/warehouse');

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

function read(rel) {
  return fs.readFileSync(path.join(FE, 'src', rel), 'utf8');
}

console.log('OPM-001C — Warehouse Operations Tests\n');

test('operations layer files exist', () => {
  for (const f of [
    'warehouseOperationsGuard.js',
    'warehouseOperationsRbac.js',
    'warehouseTransactionClient.js',
    'useWarehouseOperations.js',
    'WarehouseCreateModal.jsx',
    'WarehouseEditShell.jsx',
    'WarehouseWorkflowShell.jsx',
    'WarehouseLocationsPanel.jsx',
    'WarehouseMovementsPanel.jsx',
    'warehouseTimelineUtils.js'
  ]) {
    assert.ok(fs.existsSync(path.join(WH, f)), f);
  }
});

test('WarehouseOperationalModule phase OPM-001C', () => {
  const mod = fs.readFileSync(path.join(WH, 'WarehouseOperationalModule.jsx'), 'utf8');
  assert.ok(mod.includes("PHASE = 'OPM-001C'"));
  assert.ok(mod.includes('WarehouseCreateModal'));
  assert.ok(mod.includes('warehouseOperationsGuard'));
  assert.ok(!mod.includes('createWarehouse') || mod.includes('useWarehouseOperations'));
});

test('wmsV1ApiClient exposes createWarehouse only (existing POST)', () => {
  const api = read('domains/logistics-operational/services/wmsV1ApiClient.js');
  assert.ok(api.includes("createWarehouse: (body) => request('POST', '/warehouses', body)"));
  assert.ok(!api.includes('PATCH'));
  assert.ok(!api.includes('DELETE'));
});

test('edit and deactivate register GAP without API', () => {
  const editGap = WAREHOUSE_OPERATION_GAPS.find((g) => g.id === 'GAP-OPM-WH-006');
  const deactGap = WAREHOUSE_OPERATION_GAPS.find((g) => g.id === 'GAP-OPM-WH-007');
  assert.ok(editGap);
  assert.ok(deactGap);
  const editShell = fs.readFileSync(path.join(WH, 'WarehouseEditShell.jsx'), 'utf8');
  assert.ok(editShell.includes('GAP-OPM-WH-006'));
  const editCheck = assessWarehouseOperation(WAREHOUSE_OPS.edit);
  assert.equal(editCheck.allowed, false);
});

test('movement classification inbound/outbound', () => {
  const grouped = groupMovementsByType(
    [
      { id: '1', warehouse_id: 'wh1', movement_type: 'receipt', quantity: 10 },
      { id: '2', warehouse_id: 'wh1', movement_type: 'issue', quantity: 5 },
      { id: '3', warehouse_id: 'wh1', movement_type: 'transfer', quantity: 2 }
    ],
    'wh1'
  );
  assert.equal(grouped.entradas.length, 1);
  assert.equal(grouped.saidas.length, 1);
  assert.equal(grouped.movimentacoes.length, 1);
});

test('no technical error strings exposed', () => {
  assert.equal(sanitizeOperationalDetail('Not Found'), null);
  assert.equal(sanitizeOperationalDetail('Error: stack'), null);
});

test('workflow shell is visual-only', () => {
  const wf = fs.readFileSync(path.join(WH, 'WarehouseWorkflowShell.jsx'), 'utf8');
  assert.ok(wf.includes('data-warehouse-workflow="shell"'));
  assert.ok(!wf.includes('smartPanel'));
});

test('GAP matrix includes operation gaps 006-008', () => {
  const matrix = getWarehouseGapMatrix();
  assert.ok(matrix.some((g) => g.id === 'GAP-OPM-WH-006'));
  assert.ok(matrix.some((g) => g.id === 'GAP-OPM-WH-008'));
});

test('other WMS modules unchanged', () => {
  for (const p of ['ReceivingModulePage']) {
    const c = read(`domains/logistics-operational/pages/standalone/${p}.jsx`);
    assert.ok(c.includes('WmsStandaloneModuleFrame'));
  }
  const inv = read('domains/logistics-operational/pages/standalone/InventoryModulePage.jsx');
  assert.ok(inv.includes('InventoryOperationalModule'));
});

test('OPM-001A framework phase token unchanged', () => {
  const tokens = read('presentation/industrial-module/industrialModuleTokens.js');
  assert.ok(tokens.includes("INDUSTRIAL_MODULE_PHASE = 'OPM-001A'"));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
