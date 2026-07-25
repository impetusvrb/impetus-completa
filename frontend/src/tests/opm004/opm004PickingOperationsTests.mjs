/**
 * OPM-004 — Picking Operations & Order Fulfillment tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computePickingKpis, computePickingIntelligence } from '../../domains/logistics-operational/modules/picking/pickingKpiUtils.js';
import { filterPickingRows, resolvePickingOperationalStatus } from '../../domains/logistics-operational/modules/picking/pickingListUtils.js';
import { buildPickingRows, buildPickingTimelineEvents } from '../../domains/logistics-operational/modules/picking/pickingRowUtils.js';
import { buildPickingWaves } from '../../domains/logistics-operational/modules/picking/pickingWaveUtils.js';
import { buildRouteView, buildActiveRoutes } from '../../domains/logistics-operational/modules/picking/pickingRouteUtils.js';
import { PICKING_EVENTS } from '../../domains/logistics-operational/modules/picking/pickingObservability.js';
import { PICKING_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/picking/pickingIntegrationContracts.js';
import { resolveLogisticsOperationalNavigation } from '../../presentation/eox/eoxRegistry.js';
import { getReuseRequirement } from '../../presentation/wms-reference-components/wmsRef001ReuseMatrix.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const PCK = path.join(FE, 'src/domains/logistics-operational/modules/picking');

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

console.log('OPM-004 — Picking Operations & Order Fulfillment Tests\n');

test('picking module directory with foundation', () => {
  for (const f of [
    'PickingOperationalModule.jsx',
    'usePickingFoundation.js',
    'PickingDetailsPanel.jsx',
    'PickingWavePanel.jsx',
    'PickingRoutePanel.jsx',
    'PickingOperationalIntelligencePanel.jsx',
    'pickingKpiUtils.js',
    'pickingInventoryIntegration.js',
    'pickingObservability.js',
    'pickingIntegrationContracts.js'
  ]) {
    assert.ok(fs.existsSync(path.join(PCK, f)), f);
  }
});

test('PickingModulePage uses operational module not generic frame', () => {
  const page = read('domains/logistics-operational/pages/standalone/PickingModulePage.jsx');
  assert.ok(page.includes('PickingOperationalModule'));
  assert.ok(page.includes('usePickingFoundation'));
  assert.ok(!page.includes('WmsStandaloneModuleFrame'));
});

test('PickingOperationalModule uses WMS-REF-001 components', () => {
  const mod = fs.readFileSync(path.join(PCK, 'PickingOperationalModule.jsx'), 'utf8');
  assert.ok(mod.includes('wms-reference-components'));
  assert.ok(mod.includes('InventoryDashboard'));
  assert.ok(mod.includes('InventoryExport'));
  assert.ok(mod.includes('InventoryGrid'));
  assert.ok(mod.includes('data-wms-order-fulfillment'));
  assert.ok(mod.includes('OPM-004'));
});

test('uses WMS-003 APIs only', () => {
  const hook = fs.readFileSync(path.join(PCK, 'usePickingFoundation.js'), 'utf8');
  assert.ok(hook.includes('listPicking'));
  assert.ok(hook.includes('listWarehouses'));
  const api = read('domains/logistics-operational/services/wmsV1ApiClient.js');
  assert.ok(api.includes('executePicking'));
  assert.ok(api.includes('completePicking'));
  assert.ok(api.includes('createMovement'));
});

test('operational status mapping for order fulfillment', () => {
  assert.equal(resolvePickingOperationalStatus({ status: 'completed' }), 'completed');
  assert.equal(resolvePickingOperationalStatus({ status: 'assigned' }), 'released');
  assert.equal(resolvePickingOperationalStatus({ status: 'picking' }), 'picking');
  assert.equal(resolvePickingOperationalStatus({ status: 'picking', metadata: { paused: true } }), 'paused');
});

test('picking rows from WMS-003 orders', () => {
  const rows = buildPickingRows({
    orders: [{
      id: 'o1',
      order_number: 'PICK-001',
      warehouse_id: 'w1',
      status: 'picking',
      priority: 3,
      metadata: { wave_id: 'WAVE-A', wave_type: 'batch', operator_name: 'João', route_stops: [{ sequence: 1 }] }
    }],
    warehouses: [{ id: 'w1', code: 'WH01' }]
  });
  assert.equal(rows[0].wave_id, 'WAVE-A');
  assert.equal(rows[0].operator, 'João');
});

test('KPIs include order fulfillment metrics', () => {
  const bundle = computePickingKpis({
    orders: [{ status: 'open', metadata: {} }, { status: 'completed', metadata: {} }],
    loadMeta: { loaded_at: new Date().toISOString() }
  });
  assert.ok(bundle.items.some((k) => k.id === 'pending'));
  assert.ok(bundle.items.some((k) => k.id === 'exceptions'));
  assert.ok(bundle.items.some((k) => k.id === 'sync'));
});

test('picking waves operational view', () => {
  const waves = buildPickingWaves([
    { id: 'o1', status: 'open', metadata: { wave_id: 'W1', wave_type: 'wave' } },
    { id: 'o2', status: 'picking', metadata: { wave_id: 'W1', wave_type: 'wave' } }
  ]);
  assert.equal(waves.length, 1);
  assert.equal(waves[0].orders.length, 2);
});

test('route view from metadata', () => {
  const rows = buildPickingRows({
    orders: [{
      id: 'o1',
      order_number: 'P1',
      warehouse_id: 'w1',
      status: 'picking',
      metadata: { route_stops: [{ sequence: 1, address_code: 'A-01', item_code: 'SKU-1', qty: 5 }], route_completed_stops: 0 }
    }],
    warehouses: []
  });
  const routes = buildActiveRoutes(rows);
  assert.equal(routes.length, 1);
  const view = buildRouteView(rows[0]);
  assert.equal(view.stops.length, 1);
});

test('timeline events from orders', () => {
  const events = buildPickingTimelineEvents([
    { id: 'o1', order_number: 'P1', created_at: new Date().toISOString(), status: 'picking', metadata: { picking_started_at: new Date().toISOString() } }
  ]);
  assert.ok(events.length >= 2);
});

test('search and filter picking rows', () => {
  const rows = [
    { order_number: 'P1', wave_id: 'W1', operator: 'Alpha', operational_status: 'pending', wave_type_label: '', route_zone: '', warehouse: '', operational_status_label: 'Pendente', priority: 5 },
    { order_number: 'P2', wave_id: 'W2', operator: 'Beta', operational_status: 'completed', wave_type_label: '', route_zone: '', warehouse: '', operational_status_label: 'Concluída', priority: 5 }
  ];
  assert.equal(filterPickingRows(rows, { search: 'alpha' }).length, 1);
  assert.equal(filterPickingRows(rows, { statusFilter: 'completed' }).length, 1);
});

test('observability events defined', () => {
  for (const ev of ['LOADED', 'ORDER_ASSIGNED', 'STARTED', 'PAUSED', 'COMPLETED', 'DIVERGENCE', 'ROUTE_VIEWED', 'EXPORT']) {
    assert.ok(PICKING_EVENTS[ev], ev);
  }
});

test('integration contracts shipping and inventory', () => {
  assert.equal(PICKING_INTEGRATION_CONTRACTS.inventory.status, 'active');
  assert.equal(PICKING_INTEGRATION_CONTRACTS.shipping.status, 'contract_only');
  assert.equal(PICKING_INTEGRATION_CONTRACTS.inventory.movementType, 'pick');
});

test('inventory integration uses createMovement and completePicking', () => {
  const integ = fs.readFileSync(path.join(PCK, 'pickingInventoryIntegration.js'), 'utf8');
  assert.ok(integ.includes('createMovement'));
  assert.ok(integ.includes("movement_type: 'pick'"));
  assert.ok(integ.includes('completePicking'));
  assert.ok(integ.includes('executePicking'));
});

test('EOX breadcrumb picking phase OPM-004', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/picking');
  assert.equal(cfg.module, 'Picking');
  assert.equal(cfg.phase, 'OPM-004');
});

test('WMS-REF-001 reuse matrix requires picking components', () => {
  for (const c of ['InventoryDashboard', 'InventoryGrid', 'InventoryExport']) {
    const req = getReuseRequirement('picking', c);
    assert.equal(req.reuse, 'required');
  }
});

test('receiving and inventory modules unchanged', () => {
  assert.ok(read('domains/logistics-operational/pages/standalone/ReceivingModulePage.jsx').includes('ReceivingOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/InventoryModulePage.jsx').includes('InventoryOperationalModule'));
});

test('other generic WMS module frames eliminated for logistics flow modules', () => {
  const xfer = read('domains/logistics-operational/pages/standalone/TransferModulePage.jsx');
  assert.ok(xfer.includes('TransferOperationalModule'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
