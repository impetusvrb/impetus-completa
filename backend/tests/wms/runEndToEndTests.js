'use strict';

const assert = require('assert');
const { runAllEndToEndScenarios } = require('../../src/validation/wms005/wms005ScenarioRunner');
const { resetPilotMatrixForTests, recordScenarioResult, buildPilotMatrix } = require('../../src/validation/wms005/wms005PilotMatrix');
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
  console.log('WMS-005 — End-to-End Operational Scenarios\n');
  resetPilotMatrixForTests();
  resetWms005ObservabilityForTests();

  await test('catalog: five mandatory scenarios defined', async () => {
    const ids = listScenarios().map((s) => s.id);
    assert.deepStrictEqual(ids, [
      'procurement_receiving',
      'inventory_picking',
      'inventory_shipping',
      'warehouse_transfer',
      'cognitive_integrated'
    ]);
  });

  await test('E2E: all operational scenarios pass', async () => {
    const result = await runAllEndToEndScenarios();
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.results.length, 5);
    for (const r of result.results) {
      recordScenarioResult(r.scenario_id, r);
      assert.ok(r.pass, `${r.scenario_id} failed`);
    }
    const matrix = buildPilotMatrix();
    assert.strictEqual(matrix.all_pass, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  const db = require('../../src/db');
  await db.pool?.end?.();
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
