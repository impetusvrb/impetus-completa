/**
 * OPM-002A — Inventory Reference Module tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeInventoryKpis, computeInventoryIntelligence } from '../../domains/logistics-operational/modules/inventory/inventoryKpiUtils.js';
import { filterInventoryRows } from '../../domains/logistics-operational/modules/inventory/inventoryListUtils.js';
import { buildInventoryStockRows } from '../../domains/logistics-operational/modules/inventory/inventoryStockUtils.js';
import { buildInventoryTimeline, filterMovementsByTimelineFilters } from '../../domains/logistics-operational/modules/inventory/inventoryTimelineUtils.js';
import { INVENTORY_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/inventory/inventoryIntegrationContracts.js';
import { INVENTORY_EVENTS } from '../../domains/logistics-operational/modules/inventory/inventoryObservability.js';
import {
  WMS_REFERENCE_MODULE_CONTRACT,
  WMS_REFERENCE_MODULE_COMPONENTS,
  WMS_REFERENCE_MODULE_SUCCESSORS
} from '../../domains/logistics-operational/modules/inventory/wmsReferenceModulePattern.js';
import { resolveLogisticsOperationalNavigation } from '../../presentation/eox/eoxRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const INV = path.join(FE, 'src/domains/logistics-operational/modules/inventory');
const COMP = path.join(INV, 'components');

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

console.log('OPM-002A — Inventory Reference Module Tests\n');

test('reference module component library exists', () => {
  for (const f of [
    'InventoryDashboard.jsx',
    'InventoryMetrics.jsx',
    'InventorySearch.jsx',
    'InventoryFilters.jsx',
    'InventoryGrid.jsx',
    'InventoryTimeline.jsx',
    'InventoryExport.jsx',
    'index.js'
  ]) {
    assert.ok(fs.existsSync(path.join(COMP, f)), f);
  }
});

test('wmsReferenceModulePattern defines successors OPM-003 through OPM-007', () => {
  assert.equal(WMS_REFERENCE_MODULE_CONTRACT.referenceModuleId, 'inventory');
  assert.equal(WMS_REFERENCE_MODULE_CONTRACT.phase, 'OPM-002A');
  assert.ok(WMS_REFERENCE_MODULE_SUCCESSORS.some((s) => s.phase === 'OPM-003'));
  assert.ok(WMS_REFERENCE_MODULE_SUCCESSORS.some((s) => s.phase === 'OPM-007'));
  assert.ok(WMS_REFERENCE_MODULE_COMPONENTS.grid === 'InventoryGrid');
});

test('InventoryOperationalModule composes reference components', () => {
  const mod = fs.readFileSync(path.join(INV, 'InventoryOperationalModule.jsx'), 'utf8');
  assert.ok(mod.includes('InventoryDashboard'));
  assert.ok(mod.includes('InventoryExport'));
  assert.ok(mod.includes('InventoryGrid'));
  assert.ok(mod.includes('data-wms-reference-module'));
  assert.ok(mod.includes('EoxActionBar') || mod.includes('InventoryExport'));
});

test('InventoryModulePage uses foundation not generic frame', () => {
  const page = read('domains/logistics-operational/pages/standalone/InventoryModulePage.jsx');
  assert.ok(page.includes('InventoryOperationalModule'));
  assert.ok(page.includes('useInventoryFoundation'));
  assert.ok(!page.includes('WmsStandaloneModuleFrame'));
});

test('uses WMS-003 APIs only', () => {
  const hook = fs.readFileSync(path.join(INV, 'useInventoryFoundation.js'), 'utf8');
  assert.ok(hook.includes('listItems'));
  assert.ok(hook.includes('listBalances'));
  assert.ok(hook.includes('listMovements'));
  assert.ok(hook.includes('listWarehouses'));
  assert.ok(!hook.includes('fetch('));
});

test('stock rows include product and description columns', () => {
  const rows = buildInventoryStockRows({
    items: [{ id: 'i1', item_code: 'SKU-1', item_name: 'Parafuso', description: 'M6 zincado' }],
    balances: [{ id: 'b1', item_id: 'i1', warehouse_id: 'w1', quantity: 10, status: 'available' }],
    warehouses: [{ id: 'w1', code: 'WH01' }]
  });
  assert.equal(rows[0].product, 'Parafuso');
  assert.equal(rows[0].description, 'M6 zincado');
  const cols = fs.readFileSync(path.join(INV, 'inventoryColumns.jsx'), 'utf8');
  assert.ok(cols.includes("key: 'description'"));
});

test('KPI includes reserved items metric', () => {
  const bundle = computeInventoryKpis({
    items: [{ id: 'i1' }],
    stockRows: [{ item_id: 'i1', quantity: 2, status: 'reservado', reserved_quantity: 5, _item: {}, _balance: {} }],
    movements: [],
    loadMeta: { loaded_at: new Date().toISOString() }
  });
  assert.ok(bundle.items.some((k) => k.id === 'reserved'));
  assert.ok(bundle.items.some((k) => k.id === 'sync'));
});

test('timeline filters by user warehouse product', () => {
  const movements = [
    { id: 'm1', item_id: 'i1', warehouse_id: 'w1', movement_type: 'receipt', created_at: new Date().toISOString(), metadata: { operator: 'joao' } },
    { id: 'm2', item_id: 'i2', warehouse_id: 'w2', movement_type: 'issue', created_at: new Date().toISOString(), metadata: {} }
  ];
  const filtered = filterMovementsByTimelineFilters(movements, { userFilter: 'joao', warehouseFilter: 'w1', productFilter: 'i1' });
  assert.equal(filtered.length, 1);
  const timeline = buildInventoryTimeline({ movements, periodDays: null, productFilter: 'i2' });
  assert.equal(timeline.length, 1);
});

test('intelligence heuristics', () => {
  const intel = computeInventoryIntelligence({
    stockRows: [{ item_id: 'i1', quantity: 1, min_stock: 5, status: 'disponível', _item: {}, _balance: {} }],
    movements: []
  });
  assert.ok(intel.counts.belowMin >= 1);
});

test('search and status filters', () => {
  const rows = [
    { item_code: 'A', product: 'Alpha', description: 'Desc A', lot: 'L1', serial: '', address: '', warehouse: 'WH', status: 'disponível' },
    { item_code: 'B', product: 'Beta', description: 'Desc B', lot: 'L2', serial: '', address: '', warehouse: 'WH', status: 'bloqueado' }
  ];
  assert.equal(filterInventoryRows(rows, { search: 'desc a' }).length, 1);
  assert.equal(filterInventoryRows(rows, { statusFilter: 'bloqueado' }).length, 1);
});

test('observability events include GRID_SORT', () => {
  for (const ev of ['LOADED', 'FILTER', 'SEARCH', 'GRID_SORT', 'EXPORT', 'TIMELINE', 'VIEW_CHANGED']) {
    assert.ok(INVENTORY_EVENTS[ev], ev);
  }
});

test('InventoryExport uses EoxActionBar', () => {
  const exp = fs.readFileSync(path.join(COMP, 'InventoryExport.jsx'), 'utf8');
  assert.ok(exp.includes('EoxActionBar'));
  assert.ok(exp.includes('export_csv'));
});

test('integration contracts for future OPM modules', () => {
  assert.ok(INVENTORY_INTEGRATION_CONTRACTS.receiving.targetPhase === 'OPM-003');
  assert.ok(INVENTORY_INTEGRATION_CONTRACTS.picking.targetPhase === 'OPM-004');
  assert.ok(INVENTORY_INTEGRATION_CONTRACTS.warehouseIntelligence.targetPhase === 'OPM-007');
});

test('EOX breadcrumb inventory phase OPM-002A', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/inventory');
  assert.equal(cfg.module, 'Inventário');
  assert.equal(cfg.phase, 'OPM-002A');
});

test('operational WMS modules use foundation not generic frame', () => {
  const modules = [
    ['ReceivingModulePage', 'ReceivingOperationalModule'],
    ['PickingModulePage', 'PickingOperationalModule'],
    ['ShippingModulePage', 'ShippingOperationalModule'],
    ['TransferModulePage', 'TransferOperationalModule']
  ];
  for (const [page, mod] of modules) {
    const c = read(`domains/logistics-operational/pages/standalone/${page}.jsx`);
    assert.ok(c.includes(mod), page);
    assert.ok(!c.includes('WmsStandaloneModuleFrame'), page);
  }
});

test('warehouse module unchanged', () => {
  const page = read('domains/logistics-operational/pages/standalone/WarehouseModulePage.jsx');
  assert.ok(page.includes('WarehouseOperationalModule'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
