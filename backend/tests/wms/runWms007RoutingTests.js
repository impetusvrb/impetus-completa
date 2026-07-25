'use strict';

const assert = require('assert');
const {
  readFe,
  readApp,
  OPERATIONAL_SEGMENTS,
  MODULE_COMPONENTS
} = require('./wms007TestUtils');

const STANDALONE_PAGES = {
  warehouses: 'WarehouseModulePage',
  inventory: 'InventoryModulePage',
  receiving: 'ReceivingModulePage',
  picking: 'PickingModulePage',
  shipping: 'ShippingModulePage',
  transfers: 'TransferModulePage'
};

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
  console.log('WMS-007 — Routing Tests (007A standalone)\n');

  await test('App.jsx /app/logistics/* standalone routes', async () => {
    const app = readApp();
    assert.ok(app.includes('path="/app/logistics/*"'));
    assert.ok(app.includes('WmsLogisticsStandaloneRoutes'));
  });

  await test('standalone routes file maps segments to ModulePage', async () => {
    const routes = readFe('pages/WmsLogisticsStandaloneRoutes.jsx');
    for (const seg of OPERATIONAL_SEGMENTS) {
      assert.ok(routes.includes(`path="${seg}"`), seg);
      assert.ok(routes.includes(STANDALONE_PAGES[seg]), STANDALONE_PAGES[seg]);
    }
  });

  await test('legacy workspace landing + redirects', async () => {
    const legacy = readFe('pages/WmsLegacyWorkspaceRoutes.jsx');
    assert.ok(legacy.includes('WmsOperationalDashboardPage'));
    assert.ok(legacy.includes('Navigate'));
  });

  await test('module registry standalone paths', async () => {
    const reg = readFe('routes/wmsModuleRegistry.js');
    assert.ok(reg.includes('standalonePath'));
    assert.ok(reg.includes("WMS_LOGISTICS_BASE = '/app/logistics'"));
    assert.ok(reg.includes('/warehouses'));
  });

  await test('no generic module page in active routes', async () => {
    const routes = readFe('pages/WmsLogisticsStandaloneRoutes.jsx');
    assert.ok(!routes.includes('moduleId='));
    assert.ok(!routes.includes('WmsOperationalModulePage'));
  });

  await test('App.jsx preserves legacy workspace path', async () => {
    assert.ok(readApp().includes('/app/logistics-operational/workspace/*'));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
