'use strict';

const assert = require('assert');
const { readFe, readPres, OPERATIONAL_SEGMENTS } = require('./wms007TestUtils');

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
  console.log('WMS-007 — Navigation Tests (007A standalone paths)\n');

  await test('internal nav disabled — sidebar global only', async () => {
    const nav = readFe('components/WmsOperationalNav.jsx');
    assert.ok(nav.includes('return null'));
  });

  await test('navigation snapshot uses sidebar modules + standalone base', async () => {
    const reg = readFe('routes/wmsOperationalRegistry.js');
    assert.ok(reg.includes('getWmsSidebarModules()'));
    assert.ok(reg.includes('standalone_base: WMS_LOGISTICS_BASE'));
  });

  await test('presentation adapter uses standalonePath', async () => {
    const adapter = readPres('adapters/logisticsWmsPresentationAdapter.js');
    assert.ok(adapter.includes('standalonePath'));
    assert.ok(adapter.includes("m.id !== 'dashboard'"));
  });

  await test('presentation paths are /app/logistics/*', async () => {
    const adapter = readPres('adapters/logisticsWmsPresentationAdapter.js');
    assert.ok(adapter.includes('m.standalonePath'));
  });

  await test('expected sidebar labels present in registry', async () => {
    const reg = readFe('routes/wmsModuleRegistry.js');
    const labels = ['Armazéns', 'Inventário', 'Recebimento', 'Picking', 'Expedição', 'Transferências'];
    for (const label of labels) {
      assert.ok(reg.includes(label), label);
    }
  });

  await test('RBAC navigation unchanged', async () => {
    const rbac = readFe('config/wmsRbacNavigation.js');
    assert.ok(rbac.includes('filterNavByRbac'));
    for (const seg of OPERATIONAL_SEGMENTS) {
      assert.ok(rbac.includes(`${seg}:`), seg);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
