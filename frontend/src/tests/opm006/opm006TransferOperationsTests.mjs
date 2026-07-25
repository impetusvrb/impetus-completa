/**
 * OPM-006 — Transfer Management & Internal Logistics tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTransferKpis, computeTransferIntelligence } from '../../domains/logistics-operational/modules/transfers/transferKpiUtils.js';
import {
  filterTransferRows,
  resolveTransferOperationalStatus,
  resolveInternalMovementType
} from '../../domains/logistics-operational/modules/transfers/transferListUtils.js';
import { buildTransferRows, buildTransferTimelineEvents } from '../../domains/logistics-operational/modules/transfers/transferRowUtils.js';
import { buildTransferTypePanels } from '../../domains/logistics-operational/modules/transfers/transferTimelineUtils.js';
import { TRANSFER_EVENTS } from '../../domains/logistics-operational/modules/transfers/transferObservability.js';
import {
  TRANSFER_INTEGRATION_CONTRACTS,
  TRANSFER_LAYER_PRINCIPLE
} from '../../domains/logistics-operational/modules/transfers/transferIntegrationContracts.js';
import { getInternalMovementTypes } from '../../governance/opm-gov-001/opmGov001MovementContracts.js';
import { OPM_GOV_001_CERTIFIED_MOVEMENT_SEQUENCE } from '../../governance/opm-gov-001/opmGov001MovementContracts.js';
import { resolveLogisticsOperationalNavigation } from '../../presentation/eox/eoxRegistry.js';
import { getReuseRequirement } from '../../presentation/wms-reference-components/wmsRef001ReuseMatrix.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const XFR = path.join(FE, 'src/domains/logistics-operational/modules/transfers');

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

console.log('OPM-006 — Transfer Management & Internal Logistics Tests\n');

test('transfer module directory with foundation', () => {
  for (const f of [
    'TransferOperationalModule.jsx',
    'useTransferFoundation.js',
    'TransferDetailsPanel.jsx',
    'TransferRoutePanel.jsx',
    'TransferTypePanel.jsx',
    'TransferOperationalIntelligencePanel.jsx',
    'transferKpiUtils.js',
    'transferInventoryIntegration.js',
    'transferObservability.js',
    'transferIntegrationContracts.js'
  ]) {
    assert.ok(fs.existsSync(path.join(XFR, f)), f);
  }
});

test('TransferModulePage uses operational module not generic frame', () => {
  const page = read('domains/logistics-operational/pages/standalone/TransferModulePage.jsx');
  assert.ok(page.includes('TransferOperationalModule'));
  assert.ok(page.includes('useTransferFoundation'));
  assert.ok(!page.includes('WmsStandaloneModuleFrame'));
});

test('TransferOperationalModule uses WMS-REF-001 and transversal layer', () => {
  const mod = fs.readFileSync(path.join(XFR, 'TransferOperationalModule.jsx'), 'utf8');
  assert.ok(mod.includes('wms-reference-components'));
  assert.ok(mod.includes('InventoryDashboard'));
  assert.ok(mod.includes('data-wms-internal-logistics'));
  assert.ok(mod.includes('data-wms-transversal-layer'));
  assert.ok(mod.includes('OPM-006'));
});

test('transversal layer principle documented', () => {
  assert.equal(TRANSFER_LAYER_PRINCIPLE.notABusinessFlow, true);
  assert.equal(TRANSFER_LAYER_PRINCIPLE.doesNotCreateReceiptOrIssue, true);
});

test('uses WMS-003 APIs only', () => {
  const hook = fs.readFileSync(path.join(XFR, 'useTransferFoundation.js'), 'utf8');
  assert.ok(hook.includes('listTransfers'));
  const api = read('domains/logistics-operational/services/wmsV1ApiClient.js');
  assert.ok(api.includes('completeTransfer'));
  assert.ok(api.includes('createMovement'));
});

test('internal movement types from OPM-GOV-001 activated', () => {
  const types = getInternalMovementTypes();
  assert.deepEqual(types.sort(), ['crossDock', 'relocation', 'replenishment', 'transfer']);
});

test('operational status mapping', () => {
  assert.equal(resolveTransferOperationalStatus({ status: 'received' }), 'completed');
  assert.equal(resolveTransferOperationalStatus({ status: 'open', metadata: { executing: true } }), 'executing');
  assert.equal(resolveTransferOperationalStatus({ status: 'open', metadata: { released: true } }), 'released');
});

test('internal type resolution', () => {
  assert.equal(resolveInternalMovementType({ metadata: { internal_movement_type: 'crossDock' } }), 'crossDock');
  assert.equal(resolveInternalMovementType({ metadata: {} }), 'transfer');
});

test('transfer rows from WMS-003 orders', () => {
  const rows = buildTransferRows({
    orders: [{
      id: 't1',
      order_number: 'XFR-001',
      from_warehouse_id: 'w1',
      to_warehouse_id: 'w2',
      status: 'open',
      metadata: { internal_movement_type: 'relocation', zone_from: 'A', zone_to: 'B' }
    }],
    warehouses: [{ id: 'w1', code: 'WH01' }, { id: 'w2', code: 'WH02' }]
  });
  assert.equal(rows[0].internal_type, 'relocation');
  assert.equal(rows[0].from_warehouse, 'WH01');
});

test('KPIs include internal logistics metrics', () => {
  const bundle = computeTransferKpis({
    orders: [{ status: 'open' }, { status: 'received', metadata: {} }],
    loadMeta: { loaded_at: new Date().toISOString() }
  });
  assert.ok(bundle.items.some((k) => k.id === 'pending'));
  assert.ok(bundle.items.some((k) => k.id === 'completed'));
});

test('type panels for four internal movement types', () => {
  const panels = buildTransferTypePanels([
    { metadata: { internal_movement_type: 'transfer' }, status: 'open' },
    { metadata: { internal_movement_type: 'crossDock' }, status: 'open' }
  ]);
  assert.equal(panels.length, 4);
});

test('timeline events from orders', () => {
  const events = buildTransferTimelineEvents([
    { id: 't1', order_number: 'X1', created_at: new Date().toISOString(), status: 'received', updated_at: new Date().toISOString(), metadata: {} }
  ]);
  assert.ok(events.length >= 2);
});

test('observability events defined', () => {
  for (const ev of ['LOADED', 'CREATED', 'STARTED', 'COMPLETED', 'RELOCATION', 'REPLENISHMENT', 'CROSSDOCK', 'DIVERGENCE', 'EXPORT']) {
    assert.ok(TRANSFER_EVENTS[ev], ev);
  }
});

test('inventory integration uses transfer movement only never receipt pick issue', () => {
  const integ = fs.readFileSync(path.join(XFR, 'transferInventoryIntegration.js'), 'utf8');
  assert.ok(integ.includes("movement_type: 'transfer'"));
  assert.ok(integ.includes('FORBIDDEN_MOVEMENT_TYPES'));
  assert.ok(integ.includes("'receipt'"));
  assert.ok(integ.includes('completeTransfer'));
});

test('integration contracts preserve OPM-GOV-001 handoffs', () => {
  assert.equal(TRANSFER_INTEGRATION_CONTRACTS.inventory.invariant, 'Nunca gera receipt, pick ou issue');
  assert.equal(TRANSFER_INTEGRATION_CONTRACTS.receiving.status, 'contract_only');
  assert.equal(TRANSFER_INTEGRATION_CONTRACTS.picking.status, 'contract_only');
});

test('E2E certified sequence unchanged', () => {
  assert.deepEqual([...OPM_GOV_001_CERTIFIED_MOVEMENT_SEQUENCE], ['receipt', 'pick', 'issue']);
});

test('EOX breadcrumb transfers phase OPM-006', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/transfers');
  assert.equal(cfg.module, 'Transferências');
  assert.equal(cfg.phase, 'OPM-006');
});

test('WMS-REF-001 reuse matrix requires transfer components', () => {
  for (const c of ['InventoryDashboard', 'InventoryGrid', 'InventoryExport']) {
    const req = getReuseRequirement('transfers', c);
    assert.equal(req.reuse, 'required');
  }
});

test('certified modules unchanged', () => {
  assert.ok(read('domains/logistics-operational/pages/standalone/ShippingModulePage.jsx').includes('ShippingOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/ReceivingModulePage.jsx').includes('ReceivingOperationalModule'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
