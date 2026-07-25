'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO = path.join(__dirname, '../../..');

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
  console.log('WMS-004 — Navigation Tests\n');

  await test('operational registry with RBAC filter (WMS-007 modular)', async () => {
    const c = fs.readFileSync(
      path.join(REPO, 'frontend/src/domains/logistics-operational/routes/wmsOperationalRegistry.js'),
      'utf8'
    );
    assert.ok(c.includes('getWmsSidebarModules'));
    assert.ok(c.includes('WMS_OPERATIONAL_BASE'));
    const mod = fs.readFileSync(
      path.join(REPO, 'frontend/src/domains/logistics-operational/routes/wmsModuleRegistry.js'),
      'utf8'
    );
    assert.ok(mod.includes('filterNavByRbac'));
  });

  await test('App.jsx WMS standalone + legacy workspace routes', async () => {
    const c = fs.readFileSync(path.join(REPO, 'frontend/src/App.jsx'), 'utf8');
    assert.ok(c.includes('/app/logistics-operational/workspace/*'));
    assert.ok(c.includes('/app/logistics/*'));
    assert.ok(c.includes('WmsLogisticsStandaloneRoutes'));
  });

  await test('RBAC navigation mirrors WMS-003 permissions', async () => {
    const c = fs.readFileSync(
      path.join(REPO, 'frontend/src/domains/logistics-operational/config/wmsRbacNavigation.js'),
      'utf8'
    );
    assert.ok(c.includes('warehouse.read'));
    assert.ok(c.includes('inventory.read'));
    assert.ok(c.includes('receiving.execute'));
    assert.ok(!c.includes('supply.'));
  });

  await test('CC exposure registry', async () => {
    const c = fs.readFileSync(
      path.join(REPO, 'frontend/src/domains/logistics-operational/routes/wmsCommandCenterRegistry.js'),
      'utf8'
    );
    assert.ok(c.includes('WMS_CC_OPERATIONAL_EXPOSURE'));
    assert.ok(c.includes('cognitive_logic: false'));
  });

  await test('CentroComando WmsOperationalCcExposure wired', async () => {
    const c = fs.readFileSync(
      path.join(REPO, 'frontend/src/features/dashboard/centroComando/CentroComando.jsx'),
      'utf8'
    );
    assert.ok(c.includes('WmsOperationalCcExposure'));
  });

  await test('backend logistics flags WMS-004', async () => {
    const flags = require('../../src/domains/logistics-operational/shared/wmsFeatureFlags');
    delete process.env.IMPETUS_LOGISTICS_ENABLED;
    assert.strictEqual(flags.isLogisticsEnabled(), false);
    assert.strictEqual(flags.snapshot().phase, 'WMS-004');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
