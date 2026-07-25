/**
 * OPM-001B — Warehouse Foundation tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWarehouseKpis } from '../../domains/logistics-operational/modules/warehouse/warehouseKpiUtils.js';
import { filterWarehouses } from '../../domains/logistics-operational/modules/warehouse/warehouseListUtils.js';
import { toWarehouseOperationalMessage, sanitizeOperationalDetail } from '../../domains/logistics-operational/modules/warehouse/warehouseOperationalMessages.js';
import { WAREHOUSE_GAPS } from '../../domains/logistics-operational/modules/warehouse/warehouseGapRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const WH = path.join(FE, 'src/domains/logistics-operational/modules/warehouse');

const OTHER_PAGES = [
  'ReceivingModulePage',
  'PickingModulePage',
  'ShippingModulePage',
  'TransferModulePage'
];

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

console.log('OPM-001B — Warehouse Foundation Tests\n');

test('warehouse module directory exists with foundation components', () => {
  for (const f of [
    'WarehouseOperationalModule.jsx',
    'useWarehouseFoundation.js',
    'useWarehouseDetail.js',
    'WarehouseDetailsPanel.jsx',
    'warehouseGapRegistry.js',
    'warehouseKpiUtils.js',
    'warehouseExport.js'
  ]) {
    assert.ok(fs.existsSync(path.join(WH, f)), f);
  }
});

test('WarehouseModulePage uses foundation not generic frame', () => {
  const page = read('domains/logistics-operational/pages/standalone/WarehouseModulePage.jsx');
  assert.ok(page.includes('WarehouseOperationalModule'));
  assert.ok(page.includes('useWarehouseFoundation'));
  assert.ok(!page.includes('<WmsStandaloneModuleFrame'));
});

test('other WMS modules still use WmsStandaloneModuleFrame', () => {
  for (const p of OTHER_PAGES) {
    const c = read(`domains/logistics-operational/pages/standalone/${p}.jsx`);
    assert.ok(c.includes('WmsStandaloneModuleFrame'), p);
  }
});

test('InventoryModulePage upgraded to OPM-002A foundation', () => {
  const page = read('domains/logistics-operational/pages/standalone/InventoryModulePage.jsx');
  assert.ok(page.includes('InventoryOperationalModule'));
  assert.ok(!page.includes('WmsStandaloneModuleFrame'));
});

test('WarehouseOperationalModule uses OPM-001A framework imports', () => {
  const mod = fs.readFileSync(path.join(WH, 'WarehouseOperationalModule.jsx'), 'utf8');
  assert.ok(mod.includes('IndustrialModuleLayout'));
  assert.ok(mod.includes('IndustrialDataGrid'));
  assert.ok(mod.includes('IndustrialModuleStateView'));
  assert.ok(mod.includes('OPM-001B') || mod.includes('OPM-001C'));
  assert.ok(!mod.includes('POST'));
  assert.ok(!mod.includes('POST'));
});

test('useWarehouseFoundation consumes existing WMS v1 APIs only', () => {
  const hook = fs.readFileSync(path.join(WH, 'useWarehouseFoundation.js'), 'utf8');
  assert.ok(hook.includes('listWarehouses'));
  assert.ok(hook.includes('listBalances'));
  assert.ok(hook.includes('listMovements'));
  assert.ok(hook.includes('warehouseCapacity'));
});

test('GAP registry documents API lacunas', () => {
  assert.ok(WAREHOUSE_GAPS.length >= 3);
  assert.ok(WAREHOUSE_GAPS.some((g) => g.id === 'GAP-OPM-WH-001'));
});

test('KPI util marks unavailable capacity without mock data', () => {
  const kpis = computeWarehouseKpis({
    warehouses: [{ id: '1', status: 'active' }],
    balances: [],
    movements: [],
    capacities: []
  });
  assert.equal(kpis.items[0].value, 1);
  assert.equal(kpis.items[2].value, 'Dados indisponíveis');
});

test('operational messages hide technical errors', () => {
  assert.equal(toWarehouseOperationalMessage('operational_error'), 'Não foi possível consultar os dados do armazém.');
  assert.equal(sanitizeOperationalDetail('Not Found'), null);
  assert.equal(sanitizeOperationalDetail('Exception: stack trace'), null);
});

test('client-side search and filter', () => {
  const rows = [
    { id: '1', code: 'WH-A', name: 'Alpha', status: 'active' },
    { id: '2', code: 'WH-B', name: 'Beta', status: 'inactive' }
  ];
  const filtered = filterWarehouses(rows, { search: 'alpha', statusFilter: 'active' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].code, 'WH-A');
});

test('OPM-001A framework files untouched by warehouse phase token', () => {
  const tokens = fs.readFileSync(path.join(FE, 'src/presentation/industrial-module/industrialModuleTokens.js'), 'utf8');
  assert.ok(tokens.includes("INDUSTRIAL_MODULE_PHASE = 'OPM-001A'"));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
