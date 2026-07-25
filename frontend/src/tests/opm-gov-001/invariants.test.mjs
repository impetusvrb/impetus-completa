import assert from 'node:assert/strict';
import { createSuite } from './_opmGov001TestHarness.mjs';
import {
  OPM_GOV_001_INVARIANTS,
  getInvariantById
} from '../../governance/opm-gov-001/opmGov001OperationalInvariants.js';

const suite = createSuite('invariants.test');

console.log('OPM-GOV-001 invariants.test\n');

suite.test('minimum invariants catalogued', () => {
  assert.ok(OPM_GOV_001_INVARIANTS.length >= 10);
});

suite.test('receiving cannot complete without receipt', () => {
  const inv = getInvariantById('INV-RCV-001');
  assert.ok(inv.rule.includes('receipt'));
});

suite.test('picking cannot complete without stock', () => {
  const inv = getInvariantById('INV-PCK-001');
  assert.ok(inv.rule.includes('estoque'));
});

suite.test('shipping requires picking completed', () => {
  const inv = getInvariantById('INV-SHP-001');
  assert.ok(inv.rule.includes('Picking'));
});

suite.test('issue requires pick in sequence', () => {
  const inv = getInvariantById('INV-INV-001');
  assert.ok(inv.rule.includes('pick'));
});

suite.test('timeline chronological invariant', () => {
  const inv = getInvariantById('INV-TML-001');
  assert.equal(inv.module, 'timeline');
});

suite.test('all invariants certified by E2E-001', () => {
  for (const inv of OPM_GOV_001_INVARIANTS) {
    assert.equal(inv.certifiedBy, 'OPM-E2E-001');
  }
});

process.exit(suite.finish() ? 1 : 0);
