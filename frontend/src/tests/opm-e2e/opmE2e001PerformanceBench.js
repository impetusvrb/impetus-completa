/**
 * OPM-E2E-001 — Benchmarks de performance (utils puros, sem browser).
 */
import { buildReceivingRows } from '../../domains/logistics-operational/modules/receiving/receivingRowUtils.js';
import { buildPickingRows } from '../../domains/logistics-operational/modules/picking/pickingRowUtils.js';
import { buildShippingRows } from '../../domains/logistics-operational/modules/shipping/shippingRowUtils.js';
import { buildInventoryTimeline } from '../../domains/logistics-operational/modules/inventory/inventoryTimelineUtils.js';
import { filterReceivingRows } from '../../domains/logistics-operational/modules/receiving/receivingListUtils.js';
import { filterPickingRows } from '../../domains/logistics-operational/modules/picking/pickingListUtils.js';
import { filterShippingRows } from '../../domains/logistics-operational/modules/shipping/shippingListUtils.js';

export const E2E_PERF_THRESHOLDS_MS = Object.freeze({
  gridBuild100: 80,
  timeline500: 120,
  filterGrid100: 40,
  navigationResolve: 5
});

function bench(fn, iterations = 1) {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  return performance.now() - start;
}

function makeOrders(count, prefix) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    order_number: `${prefix}-${i}`,
    warehouse_id: 'wh-1',
    status: i % 3 === 0 ? 'completed' : 'open',
    created_at: new Date().toISOString(),
    metadata: { item_id: 'item-1', qty_received: 10, pick_lines: [{ item_id: 'item-1', qty_picked: 10 }] }
  }));
}

function makeMovements(count) {
  const types = ['receipt', 'pick', 'issue'];
  return Array.from({ length: count }, (_, i) => ({
    id: `mov-${i}`,
    created_at: new Date(Date.now() - i * 60000).toISOString(),
    warehouse_id: 'wh-1',
    item_id: 'item-1',
    movement_type: types[i % 3],
    quantity: 10,
    uom: 'un'
  }));
}

export function runE2ePerformanceBench() {
  const warehouses = [{ id: 'wh-1', code: 'WH01' }];
  const receivingOrders = makeOrders(100, 'RCV');
  const pickingOrders = makeOrders(100, 'PCK');
  const shippingOrders = makeOrders(100, 'SHP');
  const movements = makeMovements(500);

  const receivingGridMs = bench(() => buildReceivingRows({ orders: receivingOrders, warehouses }), 5);
  const pickingGridMs = bench(() => buildPickingRows({ orders: pickingOrders, warehouses }), 5);
  const shippingGridMs = bench(() => buildShippingRows({ orders: shippingOrders, warehouses }), 5);
  const timelineMs = bench(() => buildInventoryTimeline({ movements, periodDays: 30, limit: 100 }), 5);

  const rcvRows = buildReceivingRows({ orders: receivingOrders, warehouses });
  const pckRows = buildPickingRows({ orders: pickingOrders, warehouses });
  const shpRows = buildShippingRows({ orders: shippingOrders, warehouses });

  const filterMs =
    bench(() => filterReceivingRows(rcvRows, { search: 'RCV-5' }), 10) +
    bench(() => filterPickingRows(pckRows, { statusFilter: 'completed' }), 10) +
    bench(() => filterShippingRows(shpRows, { search: 'SHP' }), 10);

  return {
    receivingGridMs: receivingGridMs / 5,
    pickingGridMs: pickingGridMs / 5,
    shippingGridMs: shippingGridMs / 5,
    timelineMs: timelineMs / 5,
    filterMs: filterMs / 30,
    thresholds: E2E_PERF_THRESHOLDS_MS
  };
}

export function assertPerformanceWithinThresholds(results) {
  const t = E2E_PERF_THRESHOLDS_MS;
  if (results.receivingGridMs > t.gridBuild100) {
    throw new Error(`Receiving grid: ${results.receivingGridMs.toFixed(1)}ms > ${t.gridBuild100}ms`);
  }
  if (results.pickingGridMs > t.gridBuild100) {
    throw new Error(`Picking grid: ${results.pickingGridMs.toFixed(1)}ms > ${t.gridBuild100}ms`);
  }
  if (results.shippingGridMs > t.gridBuild100) {
    throw new Error(`Shipping grid: ${results.shippingGridMs.toFixed(1)}ms > ${t.gridBuild100}ms`);
  }
  if (results.timelineMs > t.timeline500) {
    throw new Error(`Timeline: ${results.timelineMs.toFixed(1)}ms > ${t.timeline500}ms`);
  }
  if (results.filterMs > t.filterGrid100) {
    throw new Error(`Filters: ${results.filterMs.toFixed(1)}ms > ${t.filterGrid100}ms`);
  }
  return true;
}
