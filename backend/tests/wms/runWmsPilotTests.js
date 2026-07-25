'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');
const { runIntegratedValidation } = require('../../src/validation/wms005/wms005ValidationRuntime');
const { runAllEndToEndScenarios } = require('../../src/validation/wms005/wms005ScenarioRunner');
const { resetPilotMatrixForTests } = require('../../src/validation/wms005/wms005PilotMatrix');
const { resetWms005ObservabilityForTests, getWms005ObservabilitySnapshot } = require('../../src/validation/wms005/wms005Observability');
const { validateRbacProfiles } = require('../../src/validation/wms005/wms005RbacValidator');
const { validateFeatureFlagModes } = require('../../src/validation/wms005/wms005FeatureFlagValidator');
const { validateWorkspaceRegistration } = require('../../src/validation/wms005/wms005WorkspaceValidator');
const { validateCommandCenterCoexistence } = require('../../src/validation/wms005/wms005CcValidator');

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
  return { ok: r.status === 0, stdout: r.stdout?.toString() || '', stderr: r.stderr?.toString() || '' };
}

(async () => {
  console.log('WMS-005 — Integrated Pilot Validation\n');
  resetPilotMatrixForTests();
  resetWms005ObservabilityForTests();

  await test('RBAC: five profiles validated', async () => {
    const r = validateRbacProfiles();
    assert.strictEqual(r.valid, true);
    assert.strictEqual(r.profiles.length, 5);
  });

  await test('Feature flags: four modes validated', async () => {
    const r = validateFeatureFlagModes();
    assert.strictEqual(r.valid, true);
    assert.strictEqual(r.modes.length, 4);
  });

  await test('Workspace: static FE registration', async () => {
    const r = validateWorkspaceRegistration();
    assert.strictEqual(r.valid, true, JSON.stringify(r.checks.filter((c) => !c.ok)));
  });

  await test('Command Center: coexistence without coupling', async () => {
    const r = validateCommandCenterCoexistence();
    assert.strictEqual(r.valid, true, JSON.stringify(r.checks.filter((c) => !c.ok)));
  });

  let scenarioResults = [];
  await test('E2E scenarios: procurement through cognitive', async () => {
    const e2e = await runAllEndToEndScenarios();
    assert.strictEqual(e2e.ok, true);
    scenarioResults = e2e.results;
  });

  await test('Integrated validation runtime', async () => {
    const r = await runIntegratedValidation({ scenario_results: scenarioResults });
    assert.strictEqual(r.valid, true, r.issues.join(', '));
    assert.ok(r.pilot_matrix.all_pass);
    assert.ok(r.cross_domain.valid);
  });

  await test('Observability: telemetry without sensitive data', async () => {
    const snap = getWms005ObservabilitySnapshot(50);
    assert.ok(snap.length > 0);
    const blob = JSON.stringify(snap);
    assert.ok(!/"password"|"secret"|"DB_PASSWORD"/i.test(blob));
  });

  const regressionSuites = [
    'test:cross-domain',
    'test:canonical-contracts',
    'test:wms-workspace'
  ];

  for (const suite of regressionSuites) {
    await test(`regression: ${suite}`, async () => {
      const r = runSuite(suite);
      assert.ok(r.ok, r.stderr.slice(-500) || r.stdout.slice(-500));
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
