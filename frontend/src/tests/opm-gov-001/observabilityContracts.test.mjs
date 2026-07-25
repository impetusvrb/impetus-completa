import assert from 'node:assert/strict';
import { createSuite } from './_opmGov001TestHarness.mjs';
import {
  OPM_GOV_001_OBSERVABILITY,
  OPM_GOV_001_E2E_REQUIRED_EVENTS,
  getAllObservabilityEventIds
} from '../../governance/opm-gov-001/opmGov001ObservabilityContracts.js';
import { RECEIVING_EVENTS } from '../../domains/logistics-operational/modules/receiving/receivingObservability.js';
import { INVENTORY_EVENTS } from '../../domains/logistics-operational/modules/inventory/inventoryObservability.js';
import { PICKING_EVENTS } from '../../domains/logistics-operational/modules/picking/pickingObservability.js';
import { SHIPPING_EVENTS } from '../../domains/logistics-operational/modules/shipping/shippingObservability.js';

const suite = createSuite('observabilityContracts.test');

console.log('OPM-GOV-001 observabilityContracts.test\n');

function moduleEvents(mod) {
  return Object.values(
    mod === 'receiving' ? RECEIVING_EVENTS
      : mod === 'inventory' ? INVENTORY_EVENTS
        : mod === 'picking' ? PICKING_EVENTS
          : SHIPPING_EVENTS
  );
}

for (const mod of ['receiving', 'inventory', 'picking', 'shipping']) {
  suite.test(`${mod} baseline events match module observability`, () => {
    const baseline = OPM_GOV_001_OBSERVABILITY[mod].events.map((e) => e.id).sort();
    const actual = moduleEvents(mod).sort();
    assert.deepEqual(baseline, actual);
  });
}

suite.test('E2E required events subset of catalog', () => {
  const all = new Set(getAllObservabilityEventIds());
  for (const ev of OPM_GOV_001_E2E_REQUIRED_EVENTS) {
    assert.ok(all.has(ev), ev);
  }
});

suite.test('required operational events documented', () => {
  const required = Object.values(OPM_GOV_001_OBSERVABILITY)
    .flatMap((d) => d.events.filter((e) => e.required).map((e) => e.id));
  assert.ok(required.includes('RECEIVING_COMPLETED'));
  assert.ok(required.includes('PICKING_COMPLETED'));
  assert.ok(required.includes('SHIPPING_DISPATCHED'));
});

process.exit(suite.finish() ? 1 : 0);
