'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runDeploymentVerification } = require('../../src/validation/ops001/ops001DeploymentVerificationRuntime');
const { loadBaselineManifest } = require('../../src/validation/ops001/ops001ManifestLoader');
const { validateRbacForWarehouseManager } = require('../../src/validation/ops001/ops001RbacValidator');

const EVIDENCE = path.join(__dirname, '../../docs/evidence');

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
  console.log('OPS-001 — Baseline Deployment Verification (READ ONLY)\n');

  await test('baseline manifest loads with valid signature', async () => {
    const b = loadBaselineManifest();
    assert.strictEqual(b.manifest.baseline_id, 'BASELINE-SUPPLY-v2.0');
    assert.strictEqual(b.signature_match, true);
  });

  await test('warehouse_manager RBAC — all WMS permissions', async () => {
    const r = validateRbacForWarehouseManager();
    assert.strictEqual(r.classification, 'PASS');
    assert.ok(r.permissions.every((p) => p.granted));
  });

  let report;
  await test('deployment verification runtime completes', async () => {
    report = runDeploymentVerification();
    assert.ok(report.baseline_id === 'BASELINE-SUPPLY-v2.0');
    assert.ok(['DEPLOYMENT VERIFIED', 'DEPLOYMENT VERIFIED WITH FINDINGS', 'DEPLOYMENT NOT CONSISTENT WITH BASELINE'].includes(report.verdict));
  });

  await test('primary cause identified', async () => {
    assert.ok(report.primary_cause);
    assert.ok(report.cross_checklist.length >= 7);
  });

  await test('WMS flags OFF in production env audit', async () => {
    assert.strictEqual(report.flags.all_wms_flags_off, true);
  });

  await test('WMS-004 chunks present in dist', async () => {
    assert.ok(report.build.wms_dist_chunks.length >= 2, `chunks=${report.build.wms_dist_chunks.length}`);
  });

  await test('workspace registered in source', async () => {
    const ws = report.workspace.registries.find((r) => r.id === 'workspace_registry');
    assert.strictEqual(ws.present, true);
    assert.strictEqual(ws.status, 'PASS');
  });

  await test('verdict is DEPLOYMENT VERIFIED WITH FINDINGS (expected)', async () => {
    assert.strictEqual(report.verdict, 'DEPLOYMENT VERIFIED WITH FINDINGS');
    assert.strictEqual(report.primary_cause, 'Feature Flag OFF');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
