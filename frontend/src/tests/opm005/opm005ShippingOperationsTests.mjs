/**
 * OPM-005 — Shipping Control & Outbound Logistics tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeShippingKpis, computeShippingIntelligence } from '../../domains/logistics-operational/modules/shipping/shippingKpiUtils.js';
import { filterShippingRows, resolveShippingOperationalStatus } from '../../domains/logistics-operational/modules/shipping/shippingListUtils.js';
import {
  buildShippingRows,
  buildShippingTimelineEvents,
  linkCompletedPickingOrders
} from '../../domains/logistics-operational/modules/shipping/shippingRowUtils.js';
import { buildLoadConsolidationView } from '../../domains/logistics-operational/modules/shipping/shippingLoadUtils.js';
import { buildOutboundDockView } from '../../domains/logistics-operational/modules/shipping/shippingDockUtils.js';
import { SHIPPING_EVENTS } from '../../domains/logistics-operational/modules/shipping/shippingObservability.js';
import { SHIPPING_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/shipping/shippingIntegrationContracts.js';
import { resolveLogisticsOperationalNavigation } from '../../presentation/eox/eoxRegistry.js';
import { getReuseRequirement } from '../../presentation/wms-reference-components/wmsRef001ReuseMatrix.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const SHP = path.join(FE, 'src/domains/logistics-operational/modules/shipping');

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

console.log('OPM-005 — Shipping Control & Outbound Logistics Tests\n');

test('shipping module directory with foundation', () => {
  for (const f of [
    'ShippingOperationalModule.jsx',
    'useShippingFoundation.js',
    'ShippingDetailsPanel.jsx',
    'ShippingLoadPanel.jsx',
    'ShippingLoadingPanel.jsx',
    'ShippingOperationalIntelligencePanel.jsx',
    'shippingKpiUtils.js',
    'shippingInventoryIntegration.js',
    'shippingObservability.js',
    'shippingIntegrationContracts.js'
  ]) {
    assert.ok(fs.existsSync(path.join(SHP, f)), f);
  }
});

test('ShippingModulePage uses operational module not generic frame', () => {
  const page = read('domains/logistics-operational/pages/standalone/ShippingModulePage.jsx');
  assert.ok(page.includes('ShippingOperationalModule'));
  assert.ok(page.includes('useShippingFoundation'));
  assert.ok(!page.includes('WmsStandaloneModuleFrame'));
});

test('ShippingOperationalModule uses WMS-REF-001 components', () => {
  const mod = fs.readFileSync(path.join(SHP, 'ShippingOperationalModule.jsx'), 'utf8');
  assert.ok(mod.includes('wms-reference-components'));
  assert.ok(mod.includes('InventoryDashboard'));
  assert.ok(mod.includes('InventoryExport'));
  assert.ok(mod.includes('data-wms-outbound-logistics'));
  assert.ok(mod.includes('OPM-005'));
});

test('uses WMS-003 APIs only', () => {
  const hook = fs.readFileSync(path.join(SHP, 'useShippingFoundation.js'), 'utf8');
  assert.ok(hook.includes('listShipping'));
  assert.ok(hook.includes('listPicking'));
  const api = read('domains/logistics-operational/services/wmsV1ApiClient.js');
  assert.ok(api.includes('dispatchShipping'));
  assert.ok(api.includes('createMovement'));
});

test('operational status mapping for outbound', () => {
  assert.equal(resolveShippingOperationalStatus({ status: 'shipped' }), 'shipped');
  assert.equal(resolveShippingOperationalStatus({ status: 'open', metadata: { loading: true } }), 'loading');
  assert.equal(resolveShippingOperationalStatus({ status: 'open', metadata: {} }), 'awaiting_picking');
});

test('shipping rows from WMS-003 orders', () => {
  const rows = buildShippingRows({
    orders: [{
      id: 'o1',
      order_number: 'SHP-001',
      carrier_ref: 'DHL',
      warehouse_id: 'w1',
      status: 'staged',
      metadata: { carrier_name: 'DHL Express', load_id: 'LOAD-1', picking_order_id: 'p1' }
    }],
    warehouses: [{ id: 'w1', code: 'WH01' }],
    docks: []
  });
  assert.equal(rows[0].carrier, 'DHL Express');
  assert.equal(rows[0].load_id, 'LOAD-1');
});

test('KPIs include outbound metrics', () => {
  const bundle = computeShippingKpis({
    orders: [{ status: 'open', metadata: {} }, { status: 'shipped', metadata: {} }],
    docks: [{ id: 'd1' }],
    loadMeta: { loaded_at: new Date().toISOString() }
  });
  assert.ok(bundle.items.some((k) => k.id === 'ready'));
  assert.ok(bundle.items.some((k) => k.id === 'shipped'));
  assert.ok(bundle.items.some((k) => k.id === 'sync'));
});

test('load consolidation view', () => {
  const loads = buildLoadConsolidationView([
    { id: 'o1', order_number: 'S1', metadata: { load_id: 'L1', carrier_name: 'X' } },
    { id: 'o2', order_number: 'S2', metadata: { load_id: 'L1' } }
  ]);
  assert.equal(loads.length, 1);
  assert.equal(loads[0].orders.length, 2);
});

test('outbound dock panel view', () => {
  const view = buildOutboundDockView({
    docks: [{ id: 'd1', location_code: 'DOCA-S1' }],
    orders: [{ id: 'o1', order_number: 'SHP-1', status: 'staged', metadata: { outbound_dock_id: 'd1', loading: true } }]
  });
  assert.ok(view.some((d) => d.status === 'occupied'));
});

test('picking integration links completed orders', () => {
  const candidates = linkCompletedPickingOrders(
    [{ id: 'p1', status: 'completed' }, { id: 'p2', status: 'open' }],
    [{ id: 's1', metadata: { picking_order_id: 'p1' } }]
  );
  assert.equal(candidates.length, 0);
});

test('timeline events from orders', () => {
  const events = buildShippingTimelineEvents([
    { id: 'o1', order_number: 'S1', created_at: new Date().toISOString(), status: 'shipped', metadata: { loading_started_at: new Date().toISOString() } }
  ]);
  assert.ok(events.length >= 2);
});

test('observability events defined', () => {
  for (const ev of ['LOADED', 'ORDER_RECEIVED', 'LOADING_STARTED', 'LOADING_COMPLETED', 'DISPATCHED', 'DIVERGENCE', 'EXPORT']) {
    assert.ok(SHIPPING_EVENTS[ev], ev);
  }
});

test('integration contracts picking and inventory', () => {
  assert.equal(SHIPPING_INTEGRATION_CONTRACTS.picking.status, 'active');
  assert.equal(SHIPPING_INTEGRATION_CONTRACTS.inventory.status, 'active');
  assert.equal(SHIPPING_INTEGRATION_CONTRACTS.inventory.movementType, 'issue');
});

test('inventory integration uses dispatch and createMovement', () => {
  const integ = fs.readFileSync(path.join(SHP, 'shippingInventoryIntegration.js'), 'utf8');
  assert.ok(integ.includes('dispatchShipping'));
  assert.ok(integ.includes("movement_type: 'issue'"));
});

test('EOX breadcrumb shipping phase OPM-005', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/shipping');
  assert.equal(cfg.module, 'Expedição');
  assert.equal(cfg.phase, 'OPM-005');
});

test('WMS-REF-001 reuse matrix requires shipping components', () => {
  for (const c of ['InventoryDashboard', 'InventoryGrid', 'InventoryExport']) {
    const req = getReuseRequirement('shipping', c);
    assert.equal(req.reuse, 'required');
  }
});

test('receiving picking inventory unchanged', () => {
  assert.ok(read('domains/logistics-operational/pages/standalone/ReceivingModulePage.jsx').includes('ReceivingOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/PickingModulePage.jsx').includes('PickingOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/InventoryModulePage.jsx').includes('InventoryOperationalModule'));
});

test('transfer module operational OPM-006', () => {
  const page = read('domains/logistics-operational/pages/standalone/TransferModulePage.jsx');
  assert.ok(page.includes('TransferOperationalModule'));
  assert.ok(!page.includes('WmsStandaloneModuleFrame'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
