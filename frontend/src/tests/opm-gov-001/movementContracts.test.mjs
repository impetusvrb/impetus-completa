import assert from 'node:assert/strict';
import { createSuite } from './_opmGov001TestHarness.mjs';
import {
  OPM_GOV_001_MOVEMENTS,
  OPM_GOV_001_CERTIFIED_MOVEMENT_SEQUENCE,
  getActiveMovementTypes,
  getReservedInternalMovementTypes
} from '../../governance/opm-gov-001/opmGov001MovementContracts.js';

const suite = createSuite('movementContracts.test');

console.log('OPM-GOV-001 movementContracts.test\n');

suite.test('business movements receipt and issue active', () => {
  const ids = OPM_GOV_001_MOVEMENTS.business.types.map((t) => t.id);
  assert.deepEqual(ids, ['receipt', 'issue']);
});

suite.test('fulfillment movement pick active', () => {
  assert.equal(OPM_GOV_001_MOVEMENTS.fulfillment.types[0].id, 'pick');
  assert.equal(OPM_GOV_001_MOVEMENTS.fulfillment.types[0].status, 'active');
});

suite.test('internal movements activated OPM-006', () => {
  const reserved = getReservedInternalMovementTypes();
  assert.deepEqual(reserved.sort(), ['crossDock', 'relocation', 'replenishment', 'transfer']);
  assert.equal(OPM_GOV_001_MOVEMENTS.internal.status, 'active');
  assert.equal(OPM_GOV_001_MOVEMENTS.internal.activatedBy, 'OPM-006');
});

suite.test('certified E2E sequence frozen', () => {
  assert.deepEqual([...OPM_GOV_001_CERTIFIED_MOVEMENT_SEQUENCE], ['receipt', 'pick', 'issue']);
});

suite.test('active movement types count', () => {
  assert.deepEqual(getActiveMovementTypes().sort(), ['issue', 'pick', 'receipt']);
});

process.exit(suite.finish() ? 1 : 0);
