'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');

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

function runScript(script) {
  const r = spawnSync('npm', ['run', script], { cwd: BACKEND, stdio: 'pipe', env: process.env });
  return r.status === 0;
}

(async () => {
  console.log('WMS-007A — Regression Tests\n');

  await test('WMS-004 workspace tests', async () => {
    assert.ok(runScript('test:wms-workspace'));
  });

  await test('WMS-004 navigation tests', async () => {
    assert.ok(runScript('test:wms-navigation'));
  });

  await test('WMS-005 static validation', async () => {
    assert.ok(runScript('test:wms005-static'));
  });

  await test('WMS-007 routing (updated standalone)', async () => {
    assert.ok(runScript('test:wms007-routing'));
  });

  await test('WMS-007 modules API isolation', async () => {
    assert.ok(runScript('test:wms007-modules'));
  });

  await test('CC exposure registry intact', async () => {
    const cc = require('fs').readFileSync(
      path.join(BACKEND, '../frontend/src/domains/logistics-operational/routes/wmsCommandCenterRegistry.js'),
      'utf8'
    );
    assert.ok(cc.includes('cognitive_logic: false'));
    assert.ok(cc.includes('WmsOperationalCcExposure') || cc.includes('wms_operational_cc_exposure'));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
