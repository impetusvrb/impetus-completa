import assert from 'node:assert/strict';
import { createSuite } from './_opmGov001TestHarness.mjs';
import { OPM_GOV_001_HANDOFFS, getHandoffById } from '../../governance/opm-gov-001/opmGov001HandoffContracts.js';
import { RECEIVING_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/receiving/receivingIntegrationContracts.js';
import { PICKING_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/picking/pickingIntegrationContracts.js';
import { SHIPPING_INTEGRATION_CONTRACTS } from '../../domains/logistics-operational/modules/shipping/shippingIntegrationContracts.js';

const suite = createSuite('handoffContracts.test');

console.log('OPM-GOV-001 handoffContracts.test\n');

suite.test('four handoffs defined', () => {
  assert.equal(OPM_GOV_001_HANDOFFS.length, 4);
});

suite.test('receiving→inventory handoff matches integration contract', () => {
  const h = getHandoffById('handoff-receiving-inventory');
  assert.equal(h.trigger.movementType, 'receipt');
  assert.equal(RECEIVING_INTEGRATION_CONTRACTS.inventory.movementType, 'receipt');
  assert.equal(RECEIVING_INTEGRATION_CONTRACTS.inventory.status, 'active');
});

suite.test('picking→shipping handoff matches shipping integration', () => {
  const h = getHandoffById('handoff-picking-shipping');
  assert.equal(h.from.event, 'PickingCompleted');
  assert.equal(h.to.event, 'ShippingReady');
  assert.equal(SHIPPING_INTEGRATION_CONTRACTS.picking.status, 'active');
});

suite.test('shipping→inventory handoff issue movement', () => {
  const h = getHandoffById('handoff-shipping-inventory');
  assert.equal(h.trigger.movementType, 'issue');
  assert.equal(SHIPPING_INTEGRATION_CONTRACTS.inventory.movementType, 'issue');
});

suite.test('inventory→picking handoff defined', () => {
  const h = getHandoffById('handoff-inventory-picking');
  assert.equal(h.from.event, 'InventoryAvailable');
  assert.equal(h.to.event, 'PickingReleased');
  assert.equal(PICKING_INTEGRATION_CONTRACTS.inventory.status, 'active');
});

process.exit(suite.finish() ? 1 : 0);
