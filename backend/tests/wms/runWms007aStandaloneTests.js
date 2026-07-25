'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { FE, readFe, MODULE_PAGES } = require('./wms007aTestUtils');

const HOOK_FILES = {
  WarehouseModulePage: 'useWarehouseModule.js',
  InventoryModulePage: 'useInventoryModule.js',
  ReceivingModulePage: 'useReceivingModule.js',
  PickingModulePage: 'usePickingModule.js',
  ShippingModulePage: 'useShippingModule.js',
  TransferModulePage: 'useTransferModule.js'
};

const API_METHODS = {
  WarehouseModulePage: 'listWarehouses',
  InventoryModulePage: 'listItems',
  ReceivingModulePage: 'listReceiving',
  PickingModulePage: 'listPicking',
  ShippingModulePage: 'listShipping',
  TransferModulePage: 'listTransfers'
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
  console.log('WMS-007A — Standalone Tests\n');

  await test('WmsStandaloneGate is technical wrapper without workspace UI', async () => {
    const gate = readFe('components/WmsStandaloneGate.jsx');
    assert.ok(gate.includes('data-wms-standalone-gate'));
    assert.ok(!gate.includes('WmsOperationalNav'));
    assert.ok(!gate.includes('Logística Operacional'));
  });

  await test('WmsStandaloneModuleFrame has module header only', async () => {
    const frame = readFe('components/WmsStandaloneModuleFrame.jsx');
    assert.ok(frame.includes('data-wms-standalone="true"'));
    assert.ok(frame.includes('screen-header'));
    assert.ok(!frame.includes('WMS-004'));
    assert.ok(!frame.includes('Logística Operacional'));
  });

  await test('foundation shell deprecated without visual chrome', async () => {
    const shell = readFe('components/WmsFoundationShell.jsx');
    assert.ok(shell.includes('@deprecated'));
    assert.ok(!shell.includes('WmsOperationalNav'));
  });

  await test('WarehouseModulePage uses OPM-001B foundation module', async () => {
    const c = readFe('pages/standalone/WarehouseModulePage.jsx');
    assert.ok(c.includes('WarehouseOperationalModule'));
    assert.ok(c.includes('useWarehouseFoundation'));
  });

  await test('useWarehouseFoundation uses listWarehouses API', async () => {
    const h = fs.readFileSync(path.join(FE, 'modules/warehouse/useWarehouseFoundation.js'), 'utf8');
    assert.ok(h.includes('listWarehouses'));
  });

  for (const page of MODULE_PAGES.filter((p) => p !== 'WarehouseModulePage')) {
    await test(`${page} uses standalone frame`, async () => {
      const p = path.join(FE, 'pages/standalone', `${page}.jsx`);
      assert.ok(fs.existsSync(p), p);
      const c = fs.readFileSync(p, 'utf8');
      assert.ok(c.includes('WmsStandaloneModuleFrame'));
    });

    await test(`${page} hook uses dedicated API only`, async () => {
      const hook = path.join(FE, 'hooks/modules', HOOK_FILES[page]);
      const h = fs.readFileSync(hook, 'utf8');
      const api = API_METHODS[page];
      assert.ok(h.includes(api));
      const others = Object.values(API_METHODS).filter((a) => a !== api);
      for (const o of others) assert.ok(!h.includes(o), `${page} must not use ${o}`);
    });
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
