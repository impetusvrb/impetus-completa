'use strict';

const assert = require('assert');
const { applyPilotRolloutConfig } = require('../../scripts/ops002/applyPilotRolloutConfig');
const { runPilotRolloutVerification } = require('../../src/validation/ops002/ops002PilotRolloutRuntime');
const { validateRollbackProcedure } = require('../../src/validation/ops002/ops002RbacRollbackValidator');

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
  console.log('OPS-002 — Pilot Rollout & Deployment Alignment\n');

  await test('pilot config snapshot structure', async () => {
    const r = applyPilotRolloutConfig();
    assert.strictEqual(r.ok, true);
    assert.ok(r.snapshot.frontend_flags.VITE_IMPETUS_LOGISTICS_ENABLED, 'true');
  });

  let report;
  await test('pilot rollout verification runtime', async () => {
    report = await runPilotRolloutVerification();
    assert.ok(report.baseline_id === 'BASELINE-SUPPLY-v2.0');
    assert.ok(['PILOT ROLLOUT SUCCESSFUL', 'PILOT ROLLOUT SUCCESSFUL WITH OBSERVATIONS', 'PILOT ROLLOUT FAILED'].includes(report.verdict));
  });

  await test('WMS pilot flags ON', async () => {
    assert.strictEqual(report.flags.all_wms_pilot_on, true);
    assert.strictEqual(report.flags.inc048_off, true);
  });

  await test('warehouse_manager RBAC post-rollout', async () => {
    assert.strictEqual(report.rbac.classification, 'PASS');
  });

  await test('workspace modules registered', async () => {
    assert.strictEqual(report.workspace.modules.length, 7);
    assert.ok(report.workspace.modules.every((m) => m.status === 'PASS'));
  });

  await test('rollback procedure validated', async () => {
    const rb = validateRollbackProcedure();
    assert.strictEqual(rb.rollback_immediate, true);
  });

  await test('verdict not FAILED after config apply', async () => {
    assert.notStrictEqual(report.verdict, 'PILOT ROLLOUT FAILED');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
