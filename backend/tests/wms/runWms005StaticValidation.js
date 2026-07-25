'use strict';

const assert = require('assert');
const { runIntegratedValidation } = require('../../src/validation/wms005/wms005ValidationRuntime');
const { resetPilotMatrixForTests } = require('../../src/validation/wms005/wms005PilotMatrix');
const { resetWms005ObservabilityForTests } = require('../../src/validation/wms005/wms005Observability');
const { listScenarios } = require('../../src/validation/wms005/wms005ScenarioCatalog');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

(async () => {
  console.log('WMS-005 — Static Operational Validation (no DB)\n');
  resetPilotMatrixForTests();
  resetWms005ObservabilityForTests();

  await test('scenario catalog: five mandatory flows', async () => {
    assert.strictEqual(listScenarios().length, 5);
  });

  await test('integrated validation: RBAC, flags, workspace, CC, cross-domain', async () => {
    const r = await runIntegratedValidation();
    assert.strictEqual(r.valid, true, r.issues.join(', '));
    assert.ok(r.cross_domain.valid);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
