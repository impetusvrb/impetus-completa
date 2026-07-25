'use strict';

const assert = require('assert');
const { readFe, OPERATIONAL_SEGMENTS } = require('./wms007TestUtils');

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
  console.log('WMS-007 — Workspace Tests (007A decoupled)\n');

  await test('standalone gate without workspace shell UI', async () => {
    const gate = readFe('components/WmsStandaloneGate.jsx');
    assert.ok(gate.includes('data-wms-standalone-gate'));
    assert.ok(!gate.includes('WmsOperationalNav'));
  });

  await test('standalone module frame with RBAC and states', async () => {
    const frame = readFe('components/WmsStandaloneModuleFrame.jsx');
    assert.ok(frame.includes('canAccessWmsModule'));
    assert.ok(frame.includes('WmsModuleLoading'));
    assert.ok(frame.includes('WmsModuleEmpty'));
    assert.ok(frame.includes('WmsModuleError'));
    assert.ok(frame.includes('WmsModulePermissionDenied'));
  });

  await test('dashboard landing aggregates APIs (CC landing only)', async () => {
    const c = readFe('pages/WmsOperationalDashboardPage.jsx');
    assert.ok(c.includes('listWarehouses'));
    assert.ok(c.includes('listReceiving'));
    assert.ok(!c.includes('Math.random'));
  });

  await test('operational registry phase WMS-007A', async () => {
    const reg = readFe('routes/wmsOperationalRegistry.js');
    assert.ok(reg.includes('WMS_MODULE_PHASE'));
    assert.ok(reg.includes('getWmsSidebarModules'));
    assert.ok(reg.includes('WMS_LOGISTICS_BASE'));
  });

  await test('six operational modules in registry', async () => {
    const reg = readFe('routes/wmsModuleRegistry.js');
    for (const seg of OPERATIONAL_SEGMENTS) {
      assert.ok(reg.includes(`id: '${seg}'`), seg);
    }
  });

  await test('horizontal nav disabled', async () => {
    const nav = readFe('components/WmsOperationalNav.jsx');
    assert.ok(nav.includes('return null'));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
