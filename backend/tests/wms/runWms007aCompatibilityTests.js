'use strict';

const assert = require('assert');
const { readFe, STANDALONE_PATHS } = require('./wms007aTestUtils');

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
  console.log('WMS-007A — Compatibility Tests\n');

  await test('CC workspace_path unchanged (landing legacy)', async () => {
    const cc = readFe('routes/wmsCommandCenterRegistry.js');
    assert.ok(cc.includes('workspace_path: WMS_OPERATIONAL_BASE'));
    const mod = readFe('routes/wmsModuleRegistry.js');
    assert.ok(mod.includes('WMS_LEGACY_WORKSPACE_BASE'));
    assert.ok(mod.includes('/app/logistics-operational/workspace'));
  });

  await test('legacy module paths redirect to standalone', async () => {
    const legacy = readFe('pages/WmsLegacyWorkspaceRoutes.jsx');
    for (const p of STANDALONE_PATHS) {
      const seg = p.split('/').pop();
      assert.ok(legacy.includes(`path={m.segment}`) || legacy.includes(`path="${seg}"`) || legacy.includes('segment'), seg);
    }
    assert.ok(legacy.includes('Navigate to={m.standalonePath}'));
  });

  await test('landing dashboard at workspace index (CC Abrir Workspace)', async () => {
    const legacy = readFe('pages/WmsLegacyWorkspaceRoutes.jsx');
    assert.ok(legacy.includes('WmsOperationalDashboardPage'));
    assert.ok(!legacy.includes('WmsOperationalNav'));
  });

  await test('bookmarks /workspace/warehouses redirect transparently', async () => {
    const reg = readFe('routes/wmsModuleRegistry.js');
    assert.ok(reg.includes('legacyPath'));
    assert.ok(reg.includes('WMS_LEGACY_WORKSPACE_BASE'));
    assert.ok(reg.includes('/warehouses'));
    assert.ok(reg.includes('standalonePath'));
  });

  await test('feature flags file untouched', async () => {
    const flags = readFe('config/wmsFeatureFlags.js');
    assert.ok(flags.includes('VITE_IMPETUS_LOGISTICS_ENABLED'));
    assert.ok(!flags.includes('WMS-007A'));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
