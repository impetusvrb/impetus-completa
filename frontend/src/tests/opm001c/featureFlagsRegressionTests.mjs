/**
 * Feature flags regression — WMS-004 snapshot static.
 */
import assert from 'node:assert/strict';
import { getWmsFeatureFlagSnapshot } from '../../domains/logistics-operational/config/wmsFeatureFlags.js';

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

console.log('Feature Flags Regression\n');

test('WMS feature flag snapshot structure', () => {
  const s = getWmsFeatureFlagSnapshot();
  assert.ok('logistics_enabled' in s);
  assert.ok('wms_operational_enabled' in s);
  assert.equal(s.phase, 'WMS-004');
  assert.equal(s.api_base, '/logistics-operational/v1');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
