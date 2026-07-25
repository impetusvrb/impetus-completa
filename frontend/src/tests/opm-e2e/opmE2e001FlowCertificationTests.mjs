/**
 * OPM-E2E-001 — End-to-End Operational Certification
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { E2E_SCENARIOS } from './opmE2e001FlowSimulator.js';
import {
  assertFinalStates,
  validateMovementChain,
  validateTimelineContinuity,
  validateObservabilityChain,
  validateEoxPhases
} from './opmE2e001Validators.js';
import { E2E_TRACEABILITY_MATRIX, getTraceabilityCoverage } from './opmE2e001Traceability.js';
import { runE2ePerformanceBench, assertPerformanceWithinThresholds } from './opmE2e001PerformanceBench.js';
import { getWmsUiObservabilitySnapshot } from '../../domains/logistics-operational/services/wmsUiObservability.js';
import { RECEIVING_EVENTS } from '../../domains/logistics-operational/modules/receiving/receivingObservability.js';
import { PICKING_EVENTS } from '../../domains/logistics-operational/modules/picking/pickingObservability.js';
import { SHIPPING_EVENTS } from '../../domains/logistics-operational/modules/shipping/shippingObservability.js';
import { INVENTORY_EVENTS } from '../../domains/logistics-operational/modules/inventory/inventoryObservability.js';
import { RECEIVING_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/receiving/receivingIntegrationContracts.js';
import { PICKING_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/picking/pickingIntegrationContracts.js';
import { SHIPPING_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/shipping/shippingIntegrationContracts.js';
import { linkCompletedPickingOrders } from '../../domains/logistics-operational/modules/shipping/shippingRowUtils.js';
import { resolveLogisticsOperationalNavigation } from '../../presentation/eox/eoxRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');

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

console.log('OPM-E2E-001 — End-to-End Operational Certification\n');

test('traceability matrix defined', () => {
  const cov = getTraceabilityCoverage();
  assert.ok(E2E_TRACEABILITY_MATRIX.length >= 15);
  assert.equal(cov.scenarios, 4);
  assert.ok(cov.modules.includes('OPM-005'));
});

for (const scenario of E2E_SCENARIOS) {
  test(`Cenário ${scenario.id} — estados finais`, () => {
    const flow = scenario.fn();
    assertFinalStates(flow, scenario.expected);
  });

  test(`Cenário ${scenario.id} — cadeia movimentos receipt→pick→issue`, () => {
    const flow = scenario.fn();
    validateMovementChain(flow.movements, flow);
    assert.equal(flow.movements.length, 3);
  });

  test(`Cenário ${scenario.id} — timeline sem lacunas`, () => {
    const flow = scenario.fn();
    validateTimelineContinuity(flow.timelineEvents);
    assert.ok(flow.timelineEvents.receiving.length >= 1);
    assert.ok(flow.timelineEvents.picking.length >= 1);
    assert.ok(flow.timelineEvents.shipping.length >= 1);
    assert.ok(flow.timelineEvents.inventory.length >= 1);
  });
}

test('Cenário happy-path — observabilidade completa', () => {
  simulateHappyPathObs();
  const snap = getWmsUiObservabilitySnapshot(50);
  validateObservabilityChain(snap, [
    RECEIVING_EVENTS.COMPLETED,
    PICKING_EVENTS.STARTED,
    PICKING_EVENTS.COMPLETED,
    INVENTORY_EVENTS.TIMELINE,
    SHIPPING_EVENTS.LOADING_STARTED,
    SHIPPING_EVENTS.DISPATCHED
  ]);
});

function simulateHappyPathObs() {
  E2E_SCENARIOS.find((s) => s.id === 'happy-path').fn();
}

test('contratos integração — cadeia activa Receiving→Inventory→Picking→Shipping', () => {
  assert.equal(RECEIVING_INTEGRATION_CONTRACTS.inventory.status, 'active');
  assert.equal(RECEIVING_INTEGRATION_CONTRACTS.inventory.movementType, 'receipt');
  assert.equal(PICKING_INTEGRATION_CONTRACTS.inventory.status, 'active');
  assert.equal(PICKING_INTEGRATION_CONTRACTS.inventory.movementType, 'pick');
  assert.equal(SHIPPING_INTEGRATION_CONTRACTS.picking.status, 'active');
  assert.equal(SHIPPING_INTEGRATION_CONTRACTS.inventory.status, 'active');
  assert.equal(SHIPPING_INTEGRATION_CONTRACTS.inventory.movementType, 'issue');
});

test('handoff Picking→Shipping via linkCompletedPickingOrders', () => {
  const picking = [{ id: 'p1', status: 'completed' }, { id: 'p2', status: 'completed' }];
  const shipping = [{ id: 's1', metadata: { picking_order_id: 'p1' } }];
  const available = linkCompletedPickingOrders(picking, shipping);
  assert.equal(available.length, 1);
  assert.equal(available[0].id, 'p2');
});

test('EOX navigation — fases certificadas sem regressão', () => {
  const base = '/app/logistics';
  const nav = {
    receiving: resolveLogisticsOperationalNavigation(`${base}/receiving`),
    inventory: resolveLogisticsOperationalNavigation(`${base}/inventory`),
    picking: resolveLogisticsOperationalNavigation(`${base}/picking`),
    shipping: resolveLogisticsOperationalNavigation(`${base}/shipping`)
  };
  validateEoxPhases(nav, {
    receiving: 'OPM-003',
    inventory: 'OPM-002A',
    picking: 'OPM-004',
    shipping: 'OPM-005'
  });
});

test('EOX — módulos operacionais preservam identidade visual', () => {
  for (const mod of ['ReceivingOperationalModule', 'InventoryOperationalModule', 'PickingOperationalModule', 'ShippingOperationalModule']) {
    const dir = mod.replace('OperationalModule', '').toLowerCase();
    const file = read(`domains/logistics-operational/modules/${dir}/${mod}.jsx`);
    assert.ok(file.includes('wms-reference-components') || file.includes('InventoryDashboard'), mod);
  }
});

test('módulos certificados OPM-001D — páginas operacionais intactas', () => {
  assert.ok(read('domains/logistics-operational/pages/standalone/ReceivingModulePage.jsx').includes('ReceivingOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/InventoryModulePage.jsx').includes('InventoryOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/PickingModulePage.jsx').includes('PickingOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/ShippingModulePage.jsx').includes('ShippingOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/TransferModulePage.jsx').includes('TransferOperationalModule'));
});

test('integrações inventário — ficheiros e movement types', () => {
  const rcv = read('domains/logistics-operational/modules/receiving/receivingInventoryIntegration.js');
  const pck = read('domains/logistics-operational/modules/picking/pickingInventoryIntegration.js');
  const shp = read('domains/logistics-operational/modules/shipping/shippingInventoryIntegration.js');
  assert.ok(rcv.includes("movement_type: 'receipt'"));
  assert.ok(pck.includes("movement_type: 'pick'"));
  assert.ok(pck.includes('trackPickingStarted'));
  assert.ok(shp.includes("movement_type: 'issue'"));
});

test('performance — grids, timeline e filtros dentro dos limiares', () => {
  const results = runE2ePerformanceBench();
  assertPerformanceWithinThresholds(results);
  console.log(`    receiving grid: ${results.receivingGridMs.toFixed(1)}ms`);
  console.log(`    picking grid: ${results.pickingGridMs.toFixed(1)}ms`);
  console.log(`    shipping grid: ${results.shippingGridMs.toFixed(1)}ms`);
  console.log(`    timeline 500: ${results.timelineMs.toFixed(1)}ms`);
  console.log(`    filters: ${results.filterMs.toFixed(1)}ms`);
});

test('evidências OPM-E2E-001 documentadas', () => {
  const docsDir = path.join(FE, 'docs/evidence');
  for (const doc of [
    'OPM-E2E-001-END-TO-END-CERTIFICATION.md',
    'OPM-E2E-001-TRACEABILITY.md',
    'OPM-E2E-001-PERFORMANCE.md',
    'OPM-E2E-001-TEST-REPORT.md',
    'OPM-E2E-001-EXECUTIVE-SUMMARY.md'
  ]) {
    assert.ok(fs.existsSync(path.join(docsDir, doc)), doc);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
