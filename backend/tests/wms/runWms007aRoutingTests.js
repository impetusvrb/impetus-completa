'use strict';

const assert = require('assert');
const { readApp, readFe, STANDALONE_PATHS, MODULE_PAGES } = require('./wms007aTestUtils');

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
  console.log('WMS-007A — Routing Tests\n');

  await test('App.jsx registers /app/logistics/* standalone group', async () => {
    const app = readApp();
    assert.ok(app.includes('path="/app/logistics/*"'));
    assert.ok(app.includes('WmsLogisticsStandaloneRoutes'));
    assert.ok(app.includes('WmsStandaloneGate'));
  });

  await test('each standalone path has dedicated module route', async () => {
    const routes = readFe('pages/WmsLogisticsStandaloneRoutes.jsx');
    for (const p of STANDALONE_PATHS) {
      const seg = p.split('/').pop();
      assert.ok(routes.includes(`path="${seg}"`), seg);
    }
  });

  await test('legacy workspace preserved with redirects', async () => {
    const app = readApp();
    assert.ok(app.includes('/app/logistics-operational/workspace/*'));
    const legacy = readFe('pages/WmsLegacyWorkspaceRoutes.jsx');
    assert.ok(legacy.includes('Navigate'));
    assert.ok(legacy.includes('standalonePath'));
  });

  await test('module registry defines standalonePath per module', async () => {
    const reg = readFe('routes/wmsModuleRegistry.js');
    assert.ok(reg.includes('standalonePath'));
    assert.ok(reg.includes("WMS_LOGISTICS_BASE = '/app/logistics'"));
    for (const seg of ['warehouses', 'inventory', 'receiving', 'picking', 'shipping', 'transfers']) {
      assert.ok(reg.includes(`/${seg}`), seg);
    }
  });

  await test('no WmsOperationalLayout shell in App.jsx', async () => {
    const app = readApp();
    assert.ok(!app.includes('<WmsOperationalLayout'));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
