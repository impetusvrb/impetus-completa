'use strict';

/**
 * node src/tests/contextualDataMergeScenarios.js
 */
const assert = require('assert');
const { mergeContextualData } = require('../services/contextualDataMergeService');

function testEmpty() {
  const m = mergeContextualData([]);
  assert.deepStrictEqual(m, { kpis: [], events: [], assets: [], contextual_data: {} });
}

function testDedupeTopLevel() {
  const a = { kpis: [], events: [{ id: 'e1' }, { id: 'e2' }], assets: [], contextual_data: {} };
  const b = { kpis: [], events: [{ id: 'e1' }, { id: 'e3' }], assets: [], contextual_data: {} };
  const m = mergeContextualData([a, b]);
  assert.strictEqual(m.events.length, 3);
}

function testMergeUsers() {
  const a = { contextual_data: { users: [{ id: 'u1', name: 'A' }] } };
  const b = { contextual_data: { users: [{ id: 'u1', name: 'A' }, { id: 'u2', name: 'B' }] } };
  const m = mergeContextualData([a, b]);
  assert.strictEqual(m.contextual_data.users.length, 2);
}

function testMachineStatusSummary() {
  const a = { contextual_data: { correlation: { machine_status_summary: [{ machine_id: 'm1' }] } } };
  const b = { contextual_data: { correlation: { machine_status_summary: [{ machine_id: 'm1' }, { machine_id: 'm2' }] } } };
  const m = mergeContextualData([a, b]);
  const sum = m.contextual_data.correlation.machine_status_summary;
  assert.ok(sum.length >= 2);
}

function testWorkOrdersAndMetrics() {
  const a = {
    contextual_data: {
      work_orders: [{ id: '1', status: 'open' }],
      metrics: { machines_active: 2 }
    }
  };
  const b = {
    contextual_data: {
      work_orders: [{ id: '1', status: 'open' }, { id: '2', status: 'done' }],
      metrics: { events_recent_count: 5 }
    }
  };
  const m = mergeContextualData([a, b]);
  assert.strictEqual(m.contextual_data.work_orders.length, 2);
  assert.strictEqual(m.contextual_data.metrics.machines_active, 2);
  assert.strictEqual(m.contextual_data.metrics.events_recent_count, 5);
}

const suite = [testEmpty, testDedupeTopLevel, testMergeUsers, testMachineStatusSummary, testWorkOrdersAndMetrics];

(async () => {
  let failed = false;
  for (const t of suite) {
    try {
      t();
      console.log('OK', t.name);
    } catch (e) {
      failed = true;
      console.error('FAIL', t.name, e);
    }
  }
  if (failed) process.exit(1);
  console.log('contextualDataMergeScenarios: all passed');
})();
