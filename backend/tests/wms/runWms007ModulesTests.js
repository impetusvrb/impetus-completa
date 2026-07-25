'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {
  FE,
  readFe,
  OPERATIONAL_SEGMENTS,
  MODULE_COMPONENTS,
  MODULE_APIS
} = require('./wms007TestUtils');

const HOOK_FILES = {
  warehouses: 'useWarehouseModule.js',
  inventory: 'useInventoryModule.js',
  receiving: 'useReceivingModule.js',
  picking: 'usePickingModule.js',
  shipping: 'useShippingModule.js',
  transfers: 'useTransferModule.js'
};

const PAGE_NAMES = {
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
  console.log('WMS-007 — Modules Tests\n');

  for (const seg of OPERATIONAL_SEGMENTS) {
    const api = MODULE_APIS[seg];
    const pagePath = path.join(FE, 'pages/standalone', `${PAGE_NAMES[seg]}.jsx`);
    const hookPath = path.join(FE, 'hooks/modules', HOOK_FILES[seg]);

    await test(`${seg}: standalone page exists`, async () => {
      assert.ok(fs.existsSync(pagePath), pagePath);
      const c = fs.readFileSync(pagePath, 'utf8');
      if (seg === 'warehouses') {
        assert.ok(c.includes('WarehouseOperationalModule'));
      } else {
        assert.ok(c.includes('WmsStandaloneModuleFrame'));
        assert.ok(c.includes(`moduleId="${seg}"`));
      }
    });

    await test(`${seg}: hook consumes only ${api}`, async () => {
      if (seg === 'warehouses') {
        const foundationPath = path.join(FE, 'modules/warehouse/useWarehouseFoundation.js');
        assert.ok(fs.existsSync(foundationPath), foundationPath);
        const h = fs.readFileSync(foundationPath, 'utf8');
        assert.ok(h.includes(api), `${foundationPath} must call ${api}`);
        return;
      }
      assert.ok(fs.existsSync(hookPath), hookPath);
      const h = fs.readFileSync(hookPath, 'utf8');
      assert.ok(h.includes(api), `${hookPath} must call ${api}`);
      const otherApis = Object.values(MODULE_APIS).filter((a) => a !== api);
      for (const other of otherApis) {
        assert.ok(!h.includes(other), `${hookPath} must not call ${other}`);
      }
    });
  }

  await test('error classifier for industrial states', async () => {
    const cls = readFe('utils/wmsErrorClassifier.js');
    assert.ok(cls.includes('permission_denied'));
    assert.ok(cls.includes('api_unavailable'));
    assert.ok(cls.includes('operational_error'));
  });

  await test('deprecated generic module page throws', async () => {
    const old = readFe('pages/WmsOperationalModulePage.jsx');
    assert.ok(old.includes('descontinuado'));
    assert.ok(old.includes('throw new Error'));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
