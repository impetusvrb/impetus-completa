/**
 * OPM-003 — Receiving Operations & Inbound Logistics tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeReceivingKpis, computeReceivingIntelligence } from '../../domains/logistics-operational/modules/receiving/receivingKpiUtils.js';
import { filterReceivingRows, resolveReceivingOperationalStatus } from '../../domains/logistics-operational/modules/receiving/receivingListUtils.js';
import { buildReceivingRows, buildReceivingTimelineEvents } from '../../domains/logistics-operational/modules/receiving/receivingRowUtils.js';
import { buildDockOperationalView, extractDockLocations } from '../../domains/logistics-operational/modules/receiving/receivingDockUtils.js';
import { buildAsnCreatePayload, validateAsnForm } from '../../domains/logistics-operational/modules/receiving/receivingAsnUtils.js';
import { RECEIVING_EVENTS } from '../../domains/logistics-operational/modules/receiving/receivingObservability.js';
import { RECEIVING_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/receiving/receivingIntegrationContracts.js';
import { resolveLogisticsOperationalNavigation } from '../../presentation/eox/eoxRegistry.js';
import { getReuseRequirement } from '../../presentation/wms-reference-components/wmsRef001ReuseMatrix.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const RCV = path.join(FE, 'src/domains/logistics-operational/modules/receiving');

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

console.log('OPM-003 — Receiving Operations & Inbound Logistics Tests\n');

test('receiving module directory with foundation', () => {
  for (const f of [
    'ReceivingOperationalModule.jsx',
    'useReceivingFoundation.js',
    'ReceivingDetailsPanel.jsx',
    'ReceivingDockPanel.jsx',
    'ReceivingOperationalIntelligencePanel.jsx',
    'receivingKpiUtils.js',
    'receivingInventoryIntegration.js',
    'receivingObservability.js',
    'receivingIntegrationContracts.js'
  ]) {
    assert.ok(fs.existsSync(path.join(RCV, f)), f);
  }
});

test('ReceivingModulePage uses operational module not generic frame', () => {
  const page = read('domains/logistics-operational/pages/standalone/ReceivingModulePage.jsx');
  assert.ok(page.includes('ReceivingOperationalModule'));
  assert.ok(page.includes('useReceivingFoundation'));
  assert.ok(!page.includes('WmsStandaloneModuleFrame'));
});

test('ReceivingOperationalModule uses WMS-REF-001 components', () => {
  const mod = fs.readFileSync(path.join(RCV, 'ReceivingOperationalModule.jsx'), 'utf8');
  assert.ok(mod.includes('wms-reference-components'));
  assert.ok(mod.includes('InventoryDashboard'));
  assert.ok(mod.includes('InventoryExport'));
  assert.ok(mod.includes('InventoryGrid'));
  assert.ok(mod.includes('data-wms-inbound-entry'));
  assert.ok(mod.includes('OPM-003'));
});

test('uses WMS-003 APIs only', () => {
  const hook = fs.readFileSync(path.join(RCV, 'useReceivingFoundation.js'), 'utf8');
  assert.ok(hook.includes('listReceiving'));
  assert.ok(hook.includes('listWarehouses'));
  assert.ok(hook.includes('listLocations'));
  const api = read('domains/logistics-operational/services/wmsV1ApiClient.js');
  assert.ok(api.includes('createReceiving'));
  assert.ok(api.includes('updateReceivingStatus'));
  assert.ok(api.includes('createMovement'));
});

test('operational status mapping for ASN states', () => {
  assert.equal(resolveReceivingOperationalStatus({ status: 'completed' }), 'completed');
  assert.equal(resolveReceivingOperationalStatus({ status: 'open', metadata: { asn_status: 'in_transit' } }), 'in_transit');
  assert.equal(resolveReceivingOperationalStatus({ status: 'in_progress' }), 'inspecting');
});

test('receiving rows from WMS-003 orders', () => {
  const rows = buildReceivingRows({
    orders: [{
      id: 'o1',
      order_number: 'RCV-001',
      supplier_ref: 'FORN-A',
      warehouse_id: 'w1',
      status: 'open',
      metadata: { asn_number: 'ASN-99', po_number: 'PO-1', supplier_name: 'Fornecedor A' }
    }],
    warehouses: [{ id: 'w1', code: 'WH01' }],
    docks: [{ id: 'd1', location_code: 'DOCA-1' }]
  });
  assert.equal(rows[0].asn_number, 'ASN-99');
  assert.equal(rows[0].supplier, 'Fornecedor A');
});

test('KPIs include inbound operational metrics', () => {
  const bundle = computeReceivingKpis({
    orders: [{ status: 'open', metadata: {} }, { status: 'completed', metadata: {} }],
    docks: [{ id: 'd1' }, { id: 'd2' }],
    loadMeta: { loaded_at: new Date().toISOString() }
  });
  assert.ok(bundle.items.some((k) => k.id === 'planned'));
  assert.ok(bundle.items.some((k) => k.id === 'quarantine'));
  assert.ok(bundle.items.some((k) => k.id === 'sync'));
});

test('dock panel operational view', () => {
  const docks = extractDockLocations([{ id: 'd1', location_type: 'dock', location_code: 'D1' }]);
  assert.equal(docks.length, 1);
  const view = buildDockOperationalView({
    docks,
    orders: [{ id: 'o1', status: 'in_progress', order_number: 'RCV-1', metadata: { dock_id: 'd1' } }]
  });
  assert.ok(view.some((d) => d.status === 'occupied'));
});

test('timeline events from orders', () => {
  const events = buildReceivingTimelineEvents([
    { id: 'o1', order_number: 'RCV-1', created_at: new Date().toISOString(), status: 'open', metadata: { truck_arrived_at: new Date().toISOString() } }
  ]);
  assert.ok(events.length >= 2);
});

test('search and filter receiving rows', () => {
  const rows = [
    { asn_number: 'ASN-1', supplier: 'Alpha', operational_status: 'planned', order_number: 'R1', po_number: '', dock: '', warehouse: '', operational_status_label: 'Previsto' },
    { asn_number: 'ASN-2', supplier: 'Beta', operational_status: 'completed', order_number: 'R2', po_number: '', dock: '', warehouse: '', operational_status_label: 'Finalizado' }
  ];
  assert.equal(filterReceivingRows(rows, { search: 'alpha' }).length, 1);
  assert.equal(filterReceivingRows(rows, { statusFilter: 'completed' }).length, 1);
});

test('observability events defined', () => {
  for (const ev of ['LOADED', 'ASN_CREATED', 'DOCK_ASSIGNED', 'INSPECTION_STARTED', 'DIVERGENCE', 'COMPLETED', 'TIMELINE', 'EXPORT']) {
    assert.ok(RECEIVING_EVENTS[ev], ev);
  }
});

test('integration contracts quality and inventory', () => {
  assert.equal(RECEIVING_INTEGRATION_CONTRACTS.inventory.status, 'active');
  assert.equal(RECEIVING_INTEGRATION_CONTRACTS.quality.status, 'contract_only');
  assert.equal(RECEIVING_INTEGRATION_CONTRACTS.inventory.movementType, 'receipt');
});

test('ASN create payload and validation', () => {
  const payload = buildAsnCreatePayload({
    warehouseId: 'w1',
    orderNumber: 'RCV-1',
    asnNumber: 'ASN-1',
    supplierName: 'Fornecedor X',
    poNumber: 'PO-99'
  });
  assert.equal(payload.metadata.asn_number, 'ASN-1');
  assert.equal(payload.metadata.asn_status, 'planned');
  assert.equal(validateAsnForm({ warehouseId: 'w1', orderNumber: 'R', asnNumber: 'A' }).length, 0);
  assert.ok(validateAsnForm({}).length > 0);
});

test('ReceivingAsnPanel exists for ASN registration', () => {
  assert.ok(fs.existsSync(path.join(RCV, 'ReceivingAsnPanel.jsx')));
  const mod = fs.readFileSync(path.join(RCV, 'ReceivingOperationalModule.jsx'), 'utf8');
  assert.ok(mod.includes('ReceivingAsnPanel'));
});

test('inventory integration uses createMovement', () => {
  const integ = fs.readFileSync(path.join(RCV, 'receivingInventoryIntegration.js'), 'utf8');
  assert.ok(integ.includes('createMovement'));
  assert.ok(integ.includes("movement_type: 'receipt'"));
  assert.ok(integ.includes('updateReceivingStatus'));
});

test('EOX breadcrumb receiving phase OPM-003', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/receiving');
  assert.equal(cfg.module, 'Recebimento');
  assert.equal(cfg.phase, 'OPM-003');
});

test('WMS-REF-001 reuse matrix requires receiving components', () => {
  for (const c of ['InventoryDashboard', 'InventoryGrid', 'InventoryExport']) {
    const req = getReuseRequirement('receiving', c);
    assert.equal(req.reuse, 'required');
  }
});

test('transfer module upgraded to OPM-006 operational', () => {
  const xfer = read('domains/logistics-operational/pages/standalone/TransferModulePage.jsx');
  assert.ok(xfer.includes('TransferOperationalModule'));
});

test('inventory module unchanged', () => {
  const page = read('domains/logistics-operational/pages/standalone/InventoryModulePage.jsx');
  assert.ok(page.includes('InventoryOperationalModule'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
