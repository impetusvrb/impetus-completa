import assert from 'node:assert/strict';
import { createSuite } from './_opmGov001TestHarness.mjs';
import {
  OPM_GOV_001_LIFECYCLE,
  getAllLifecycleModuleIds
} from '../../governance/opm-gov-001/opmGov001LifecycleContracts.js';
import { resolveReceivingOperationalStatus } from '../../domains/logistics-operational/modules/receiving/receivingListUtils.js';
import { resolvePickingOperationalStatus } from '../../domains/logistics-operational/modules/picking/pickingListUtils.js';
import { resolveShippingOperationalStatus } from '../../domains/logistics-operational/modules/shipping/shippingListUtils.js';

const suite = createSuite('lifecycle.test');

console.log('OPM-GOV-001 lifecycle.test\n');

suite.test('four modules with lifecycle defined', () => {
  assert.deepEqual(getAllLifecycleModuleIds().sort(), ['inventory', 'picking', 'receiving', 'shipping']);
});

suite.test('receiving lifecycle maps to certified operational status', () => {
  assert.equal(resolveReceivingOperationalStatus({ status: 'completed' }), 'completed');
  assert.equal(resolveReceivingOperationalStatus({ status: 'in_progress' }), 'inspecting');
  assert.equal(resolveReceivingOperationalStatus({ status: 'open', metadata: { in_transit: true } }), 'in_transit');
});

suite.test('picking lifecycle maps to certified operational status', () => {
  assert.equal(resolvePickingOperationalStatus({ status: 'assigned' }), 'released');
  assert.equal(resolvePickingOperationalStatus({ status: 'picking' }), 'picking');
  assert.equal(resolvePickingOperationalStatus({ status: 'completed' }), 'completed');
});

suite.test('shipping lifecycle maps to certified operational status', () => {
  assert.equal(resolveShippingOperationalStatus({ status: 'staged' }), 'ready');
  assert.equal(resolveShippingOperationalStatus({ status: 'open', metadata: { loading: true, picking_order_id: 'p1' } }), 'loading');
  assert.equal(resolveShippingOperationalStatus({ status: 'shipped' }), 'shipped');
});

suite.test('each lifecycle has terminal state', () => {
  for (const mod of getAllLifecycleModuleIds()) {
    const lc = OPM_GOV_001_LIFECYCLE[mod];
    assert.ok(lc.states.some((s) => s.terminal), `${mod} terminal`);
  }
});

process.exit(suite.finish() ? 1 : 0);
