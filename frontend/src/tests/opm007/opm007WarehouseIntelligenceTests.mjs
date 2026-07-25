/**
 * OPM-007 — Warehouse Intelligence & Operational Optimization tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeWiDashboardKpis } from '../../domains/logistics-operational/modules/warehouse-intelligence/wiKpiUtils.js';
import { computeWiHeatmaps } from '../../domains/logistics-operational/modules/warehouse-intelligence/wiHeatmapUtils.js';
import { computeWiCapacityAnalytics } from '../../domains/logistics-operational/modules/warehouse-intelligence/wiCapacityUtils.js';
import { computeWiBottlenecks } from '../../domains/logistics-operational/modules/warehouse-intelligence/wiBottleneckUtils.js';
import { computeWiFlowAnalytics } from '../../domains/logistics-operational/modules/warehouse-intelligence/wiFlowAnalyticsUtils.js';
import {
  computeWiRecommendations,
  buildRecommendationRows
} from '../../domains/logistics-operational/modules/warehouse-intelligence/wiRecommendationUtils.js';
import {
  buildWiConsolidatedTimelineEvents,
  computeWiPerformance
} from '../../domains/logistics-operational/modules/warehouse-intelligence/wiTimelineUtils.js';
import { filterWiRecommendationRows } from '../../domains/logistics-operational/modules/warehouse-intelligence/wiListUtils.js';
import { WI_EVENTS } from '../../domains/logistics-operational/modules/warehouse-intelligence/wiObservability.js';
import {
  WI_ANALYTICAL_INVARIANTS,
  WI_LAYER_PRINCIPLE
} from '../../domains/logistics-operational/modules/warehouse-intelligence/wiAnalyticalInvariants.js';
import { WI_DATA_CONSUMPTION_CONTRACTS } from '../../domains/logistics-operational/modules/warehouse-intelligence/wiDataConsumptionContracts.js';
import { resolveLogisticsOperationalNavigation } from '../../presentation/eox/eoxRegistry.js';
import { getReuseRequirement } from '../../presentation/wms-reference-components/wmsRef001ReuseMatrix.js';
import { INVENTORY_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/inventory/inventoryIntegrationContracts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const WI = path.join(FE, 'src/domains/logistics-operational/modules/warehouse-intelligence');

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

console.log('OPM-007 — Warehouse Intelligence & Operational Optimization Tests\n');

test('warehouse intelligence module directory with foundation', () => {
  for (const f of [
    'WarehouseIntelligenceModule.jsx',
    'useWarehouseIntelligenceFoundation.js',
    'WiHeatmapPanel.jsx',
    'WiCapacityPanel.jsx',
    'WiBottleneckPanel.jsx',
    'WiFlowAnalyticsPanel.jsx',
    'WiAnalyticsMetricsPanel.jsx',
    'wiKpiUtils.js',
    'wiHeatmapUtils.js',
    'wiCapacityUtils.js',
    'wiBottleneckUtils.js',
    'wiFlowAnalyticsUtils.js',
    'wiRecommendationUtils.js',
    'wiTimelineUtils.js',
    'wiObservability.js',
    'wiDataConsumptionContracts.js',
    'wiAnalyticalInvariants.js'
  ]) {
    assert.ok(fs.existsSync(path.join(WI, f)), f);
  }
});

test('WarehouseIntelligenceModulePage uses analytical module not generic frame', () => {
  const page = read('domains/logistics-operational/pages/standalone/WarehouseIntelligenceModulePage.jsx');
  assert.ok(page.includes('WarehouseIntelligenceModule'));
  assert.ok(page.includes('useWarehouseIntelligenceFoundation'));
  assert.ok(!page.includes('WmsStandaloneModuleFrame'));
});

test('WarehouseIntelligenceModule uses WMS-REF-001 and analytical layer', () => {
  const mod = fs.readFileSync(path.join(WI, 'WarehouseIntelligenceModule.jsx'), 'utf8');
  assert.ok(mod.includes('wms-reference-components'));
  assert.ok(mod.includes('InventoryDashboard'));
  assert.ok(mod.includes('InventoryTimeline'));
  assert.ok(mod.includes('data-wms-analytical-layer'));
  assert.ok(mod.includes('OPM-007'));
});

test('analytical layer principle — no operations execution', () => {
  assert.equal(WI_LAYER_PRINCIPLE.executesOperations, false);
  assert.equal(WI_LAYER_PRINCIPLE.observesMeasuresCorrelatesRecommends, true);
  assert.ok(WI_ANALYTICAL_INVARIANTS.length >= 6);
});

test('foundation hook is read-only — no mutations', () => {
  const hook = fs.readFileSync(path.join(WI, 'useWarehouseIntelligenceFoundation.js'), 'utf8');
  assert.ok(hook.includes('listWarehouses'));
  assert.ok(hook.includes('listReceiving'));
  assert.ok(hook.includes('listTransfers'));
  assert.ok(!hook.includes('createMovement'));
  assert.ok(!hook.includes('createTransfer'));
  assert.ok(!hook.includes('completeTransfer'));
  assert.ok(!hook.includes('dispatchShipping'));
});

test('data consumption contracts cover all operational modules', () => {
  for (const key of ['inventory', 'receiving', 'picking', 'shipping', 'transfers', 'warehouses']) {
    assert.equal(WI_DATA_CONSUMPTION_CONTRACTS[key].mode, 'read_only');
    assert.equal(WI_DATA_CONSUMPTION_CONTRACTS[key].status, 'active');
  }
});

test('inventory integration contract warehouseIntelligence active', () => {
  assert.equal(INVENTORY_INTEGRATION_CONTRACTS.warehouseIntelligence.status, 'active');
  assert.equal(INVENTORY_INTEGRATION_CONTRACTS.warehouseIntelligence.targetPhase, 'OPM-007');
});

test('KPIs consolidated from WMS-003 snapshot', () => {
  const bundle = computeWiDashboardKpis({
    warehouses: [{ id: 'w1' }],
    balances: [{ quantity_on_hand: 100 }],
    movements: [{ created_at: new Date().toISOString(), metadata: { zone_from: 'A', bin_from: 'B1' } }],
    receiving: [{ status: 'open' }],
    picking: [],
    shipping: [],
    transfers: [],
    capacities: [{ total_capacity: 1000, used_capacity: 600 }]
  });
  assert.ok(bundle.items.some((k) => k.id === 'wh_occupancy'));
  assert.ok(bundle.items.some((k) => k.id === 'congestion'));
  assert.equal(bundle.partial, false);
});

test('heatmaps derive zones bins congestion underuse', () => {
  const hm = computeWiHeatmaps({
    movements: [
      { metadata: { zone_from: 'Z1', bin_from: 'B1' } },
      { metadata: { zone_from: 'Z1', bin_from: 'B2' } },
      { metadata: { zone_to: 'Z2', bin_to: 'B3' } }
    ],
    balances: [{ metadata: { zone: 'Z3' } }]
  });
  assert.ok(Array.isArray(hm.zones));
  assert.ok(Array.isArray(hm.bins));
  assert.ok(Array.isArray(hm.congested));
  assert.ok(Array.isArray(hm.underused));
});

test('capacity analytics flags critical warehouses', () => {
  const caps = computeWiCapacityAnalytics({
    warehouses: [{ id: 'w1', code: 'WH01', name: 'Main' }],
    capacities: [{ warehouse_id: 'w1', total_capacity: 100, used_capacity: 95 }]
  });
  assert.ok(caps.some((c) => c.critical === true));
});

test('bottleneck detection per operational module', () => {
  const bn = computeWiBottlenecks({
    receiving: [{ status: 'open' }, { status: 'open' }, { status: 'open' }],
    picking: [],
    shipping: [],
    transfers: [{ status: 'open' }, { status: 'open' }]
  });
  assert.ok(bn.some((b) => b.module === 'receiving'));
  assert.ok(bn.some((b) => b.module === 'transfers'));
  for (const b of bn) assert.ok(b.trace?.source);
});

test('flow analytics correlates five stages', () => {
  const flow = computeWiFlowAnalytics({
    receiving: [{ status: 'open' }],
    movements: [{ created_at: new Date().toISOString() }],
    transfers: [{ status: 'open' }],
    picking: [{ status: 'open' }],
    shipping: [{ status: 'open' }]
  });
  assert.equal(flow.stages.length, 5);
  assert.ok(flow.summary);
});

test('recommendations are traceable and informative only', () => {
  const recs = computeWiRecommendations({
    heatmaps: { congested: [{ id: 'Z1', count: 10 }], underused: [{ id: 'Z9', count: 0 }] },
    capacity: [{ warehouse_id: 'w1', warehouse: 'WH01', critical: true, occupancy_pct: 96 }],
    bottlenecks: [{ module: 'picking', moduleLabel: 'Picking', hint: 'Filas elevadas', severity: 'high', trace: { source: 'GET /v1/picking', count: 5 } }],
    flow: { summary: { totalOpenQueues: 12 } },
    transfers: [{ status: 'open' }, { status: 'open' }, { status: 'open' }]
  });
  assert.ok(recs.length >= 3);
  for (const r of recs) {
    assert.equal(r.action, 'informativo');
    assert.ok(r.trace);
  }
  const rows = buildRecommendationRows(recs);
  assert.ok(rows[0]._recommendation);
});

test('recommendation filter by search and priority', () => {
  const rows = buildRecommendationRows([
    { id: 'r1', type: 'capacity', priority: 'high', title: 'Cap WH01', message: 'x', trace: { source: 'a' } },
    { id: 'r2', type: 'flow', priority: 'low', title: 'Balance docas', message: 'y', trace: { source: 'b' } }
  ]);
  const filtered = filterWiRecommendationRows(rows, { search: 'docas', priorityFilter: 'all' });
  assert.equal(filtered.length, 1);
});

test('consolidated timeline merges operational domains', () => {
  const events = buildWiConsolidatedTimelineEvents({
    receiving: [{ id: 'r1', order_number: 'RCV-1', created_at: new Date().toISOString(), status: 'open', metadata: {} }],
    movements: [{ id: 'm1', movement_type: 'receipt', created_at: new Date().toISOString(), metadata: {} }],
    transfers: [{ id: 't1', order_number: 'XFR-1', created_at: new Date().toISOString(), status: 'open', metadata: {} }],
    picking: [{ id: 'p1', order_number: 'PCK-1', created_at: new Date().toISOString(), status: 'open', metadata: {} }],
    shipping: [{ id: 's1', order_number: 'SHP-1', created_at: new Date().toISOString(), status: 'open', metadata: {} }]
  });
  assert.ok(events.length >= 4);
});

test('performance metrics from movements picking transfers', () => {
  const perf = computeWiPerformance({
    movements: [{ created_at: new Date().toISOString(), metadata: { operator_id: 'op1' } }],
    picking: [{ status: 'completed', metadata: { operator_id: 'op1' } }],
    transfers: [{ status: 'received', metadata: { internal_movement_type: 'replenishment' } }]
  });
  assert.ok(perf.operatorProductivity != null || perf.replenishmentEfficiency != null);
});

test('observability events defined', () => {
  for (const ev of [
    'LOADED',
    'HEATMAP_VIEWED',
    'BOTTLENECK_DETECTED',
    'CAPACITY_ANALYZED',
    'RECOMMENDATION_OPENED',
    'ANALYTICS_FILTER',
    'EXPORT',
    'FLOW_ANALYZED'
  ]) {
    assert.ok(WI_EVENTS[ev], ev);
  }
});

test('EOX breadcrumb warehouse intelligence phase OPM-007', () => {
  const cfg = resolveLogisticsOperationalNavigation('/app/logistics/warehouse-intelligence');
  assert.equal(cfg.module, 'Inteligência Operacional');
  assert.equal(cfg.phase, 'OPM-007');
});

test('WMS-REF-001 reuse matrix requires WI components', () => {
  for (const c of ['InventoryDashboard', 'InventoryGrid', 'InventoryTimeline', 'InventoryExport']) {
    const req = getReuseRequirement('warehouse_intelligence', c);
    assert.equal(req.reuse, 'required');
  }
});

test('certified operational modules unchanged', () => {
  assert.ok(read('domains/logistics-operational/pages/standalone/TransferModulePage.jsx').includes('TransferOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/ShippingModulePage.jsx').includes('ShippingOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/ReceivingModulePage.jsx').includes('ReceivingOperationalModule'));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
