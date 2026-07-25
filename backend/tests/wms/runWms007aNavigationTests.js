'use strict';

const assert = require('assert');
const { readPres, readFe, STANDALONE_PATHS } = require('./wms007aTestUtils');

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
  console.log('WMS-007A — Navigation Tests\n');

  await test('presentation adapter points sidebar to standalone paths', async () => {
    const adapter = readPres('adapters/logisticsWmsPresentationAdapter.js');
    assert.ok(adapter.includes('standalonePath'));
    assert.ok(!adapter.includes('WMS_OPERATIONAL_BASE}${m.path}'));
    for (const p of STANDALONE_PATHS) {
      assert.ok(adapter.includes(p.split('/').pop()) || readFe('routes/wmsModuleRegistry.js').includes(p));
    }
  });

  await test('sidebar registry excludes dashboard', async () => {
    const reg = readFe('routes/wmsModuleRegistry.js');
    assert.ok(reg.includes('sidebar: false'));
    assert.ok(reg.includes('getWmsSidebarModules'));
  });

  await test('internal horizontal nav disabled', async () => {
    const nav = readFe('components/WmsOperationalNav.jsx');
    assert.ok(nav.includes('return null'));
  });

  await test('navigation snapshot exposes standalone_base', async () => {
    const op = readFe('routes/wmsOperationalRegistry.js');
    assert.ok(op.includes('standalone_base: WMS_LOGISTICS_BASE'));
  });

  await test('LOGÍSTICA section labels preserved', async () => {
    const reg = readFe('routes/wmsModuleRegistry.js');
    for (const label of ['Armazéns', 'Inventário', 'Recebimento', 'Picking', 'Expedição', 'Transferências']) {
      assert.ok(reg.includes(label), label);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
