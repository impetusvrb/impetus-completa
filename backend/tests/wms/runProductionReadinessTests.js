'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');
const { runFrozenHomologation } = require('../../src/validation/wms006/wms006HomologationRuntime');
const { buildBaselineCandidateManifest } = require('../../src/validation/wms006/wms006BaselineCandidateManifest');
const { validateControlledActivation } = require('../../src/validation/wms006/wms006ControlledActivation');
const { compareWithWms005Baseline, WMS005_BASELINE } = require('../../src/validation/wms006/wms006RegressionBaseline');
const { resetWms006ObservabilityForTests, getWms006ObservabilitySnapshot } = require('../../src/validation/wms006/wms006Observability');

const BACKEND = path.join(__dirname, '../..');

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

function runSuite(script) {
  const r = spawnSync('npm', ['run', script], { cwd: BACKEND, stdio: 'pipe', env: process.env });
  return { ok: r.status === 0, stderr: r.stderr?.toString() || '', stdout: r.stdout?.toString() || '' };
}

(async () => {
  console.log('WMS-006 — Frozen Homologation & Production Readiness\n');
  resetWms006ObservabilityForTests();

  await test('WMS-005 baseline frozen (5 scenarios)', async () => {
    assert.strictEqual(WMS005_BASELINE.scenarios.length, 5);
    assert.strictEqual(WMS005_BASELINE.verdict, 'READY FOR WMS-006');
  });

  await test('controlled activation: pilot only, rollback, no global prod', async () => {
    const r = validateControlledActivation();
    assert.strictEqual(r.valid, true, JSON.stringify(r.checks.filter((c) => !c.ok)));
    assert.strictEqual(r.global_production_blocked, true);
  });

  await test('baseline candidate manifest', async () => {
    const m = buildBaselineCandidateManifest();
    assert.strictEqual(m.manifest_id, 'BASELINE-CANDIDATE-SUPPLY-WMS-v2.0');
    assert.strictEqual(m.baseline_system_locked, 'v1.4');
    assert.ok(m.contracts.supply);
    assert.ok(m.contracts.pilot);
    assert.strictEqual(m.rev002_gate, 'mandatory_before_baseline_v2');
  });

  let homologation;
  await test('frozen homologation: E2E + regression vs WMS-005', async () => {
    homologation = await runFrozenHomologation();
    assert.strictEqual(homologation.e2e.ok, true);
    assert.strictEqual(homologation.regression.valid, true);
    assert.strictEqual(homologation.regression.no_regression, true);
    assert.strictEqual(homologation.cross_domain.valid, true);
    assert.strictEqual(homologation.architecture_frozen, true);
  });

  await test('production readiness checklist certified', async () => {
    assert.ok(homologation.checklist.all_pass);
    assert.ok(homologation.checklist.certified);
    const cats = homologation.checklist.items.map((i) => i.id);
    for (const id of ['contracts', 'apis', 'rbac', 'rollback', 'monitoring', 'regression_wms005']) {
      assert.ok(cats.includes(id), `missing ${id}`);
    }
  });

  await test('observability: no sensitive data in telemetry', async () => {
    const snap = getWms006ObservabilitySnapshot(50);
    assert.ok(snap.length > 0);
    assert.ok(!/"password"|"secret"|"DB_PASSWORD"/i.test(JSON.stringify(snap)));
  });

  const suites = ['test:cross-domain', 'test:canonical-contracts', 'test:wms-workspace'];
  for (const suite of suites) {
    await test(`regression suite: ${suite}`, async () => {
      const r = runSuite(suite);
      assert.ok(r.ok, r.stderr.slice(-400) || r.stdout.slice(-400));
    });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  const db = require('../../src/db');
  await db.pool?.end?.();
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
