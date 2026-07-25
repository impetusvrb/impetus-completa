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
  console.log('GF-027 — Supply Navigation Tests\n');

  await test('workspace registry exists with route + CC', async () => {
    const file = path.join(REPO, 'frontend/src/domains/supply/routes/supplyWorkspaceRegistry.js');
    const c = fs.readFileSync(file, 'utf8');
    assert.ok(c.includes('SUPPLY_NAV'));
    assert.ok(c.includes('/app/supply/workspace'));
    assert.ok(c.includes('SUPPLY_COMMAND_CENTER'));
    assert.ok(c.includes('supply_native'));
  });

  await test('feature flags frontend default OFF', async () => {
    const file = path.join(REPO, 'frontend/src/domains/supply/config/supplyFeatureFlags.js');
    const c = fs.readFileSync(file, 'utf8');
    assert.ok(c.includes('VITE_IMPETUS_SUPPLY_ENABLED'));
    assert.ok(c.includes('VITE_IMPETUS_SUPPLY_MENU'));
    assert.ok(c.includes('VITE_IMPETUS_SUPPLY_WORKSPACE'));
    assert.ok(c.includes('false'));
  });

  await test('App.jsx lazy route registered', async () => {
    const c = fs.readFileSync(path.join(REPO, 'frontend/src/App.jsx'), 'utf8');
    assert.ok(c.includes('SupplyWorkspacePage'));
    assert.ok(c.includes('/app/supply/workspace'));
  });

  await test('CentroComando supply promotion wired', async () => {
    const c = fs.readFileSync(
      path.join(REPO, 'frontend/src/features/dashboard/centroComando/CentroComando.jsx'),
      'utf8'
    );
    assert.ok(c.includes('SupplyNativeCockpitPromotion'));
    assert.ok(c.includes('resolveSupplyCockpitRuntime'));
  });

  await test('supply native cockpit registry: 7 hubs', async () => {
    const c = fs.readFileSync(
      path.join(REPO, 'frontend/src/cognitiveRuntime/cockpit/supplyNativeCockpitRegistry.js'),
      'utf8'
    );
    const hubCount = (c.match(/_ops:/g) || []).length + (c.match(/procurement_overview:/g) || []).length;
    assert.ok(hubCount >= 7, `expected 7 hubs, found ${hubCount}`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
