'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');
const { readFe, readPres } = require('./wms007TestUtils');

const BACKEND = path.join(__dirname, '../..');
const REPO = path.join(BACKEND, '..');

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
  console.log('WMS-007 — Regression Tests\n');

  await test('WMS-004 workspace tests still pass (adapted)', async () => {
    assert.ok(runScript('test:wms-workspace'));
  });

  await test('WMS-004 navigation tests still pass', async () => {
    assert.ok(runScript('test:wms-navigation'));
  });

  await test('no switch(title) pattern in workspace pages', async () => {
    const layout = readFe('pages/WmsOperationalLayout.jsx');
    assert.ok(!layout.includes('switch'));
    const modules = readFe('pages/modules/WarehouseModule.jsx');
    assert.ok(!modules.includes('TITLES['));
  });

  await test('no placeholder Not Found in modules', async () => {
    const frame = readFe('components/WmsModularModuleFrame.jsx');
    assert.ok(!frame.includes('Not Found'));
    assert.ok(!frame.includes('placeholder'));
  });

  await test('feature flags file untouched semantics', async () => {
    const flags = readFe('config/wmsFeatureFlags.js');
    assert.ok(flags.includes('VITE_IMPETUS_LOGISTICS_ENABLED'));
    assert.ok(!flags.includes('WMS-007'));
  });

  await test('command center exposure preserved', async () => {
    const cc = require('fs').readFileSync(
      path.join(REPO, 'frontend/src/domains/logistics-operational/routes/wmsCommandCenterRegistry.js'),
      'utf8'
    );
    assert.ok(cc.includes('WMS_CC_OPERATIONAL_EXPOSURE'));
  });

  await test('presentation WMS adapter wired in registry', async () => {
    const reg = require('fs').readFileSync(
      path.join(REPO, 'frontend/src/presentation/navigation/presentationNavigationRegistry.js'),
      'utf8'
    );
    assert.ok(reg.includes('buildLogisticsWmsPresentationSection'));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
