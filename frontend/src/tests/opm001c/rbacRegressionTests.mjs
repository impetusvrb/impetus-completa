/**
 * RBAC regression — warehouse operations RBAC mirror.
 */
import assert from 'node:assert/strict';
import { canWriteWarehouse, getWarehouseUserProfile } from '../../domains/logistics-operational/modules/warehouse/warehouseOperationsRbac.js';

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

console.log('RBAC Regression (Warehouse Operations)\n');

test('warehouse operations RBAC helpers exist', () => {
  assert.equal(typeof canWriteWarehouse(), 'boolean');
  assert.equal(typeof getWarehouseUserProfile(), 'string');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
