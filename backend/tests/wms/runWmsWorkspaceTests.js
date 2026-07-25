'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO = path.join(__dirname, '../../..');
const FE = path.join(REPO, 'frontend/src/domains/logistics-operational');

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

function readFe(rel) {
  return fs.readFileSync(path.join(FE, rel), 'utf8');
}

function auditNoDirectDomainAccess() {
  const forbidden = [
    'operationalCompatibilityLayer',
    'warehouseLegacyAdapter',
    'domains/logistics-operational/compatibility',
    '/logistics-operational/operations/overview',
    'Math.random'
  ];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(jsx?|tsx?)$/.test(ent.name)) {
        const c = fs.readFileSync(p, 'utf8');
        for (const token of forbidden) {
          assert.ok(!c.includes(token), `${path.relative(FE, p)}: forbidden ${token}`);
        }
      }
    }
  };
  walk(FE);
}

(async () => {
  console.log('WMS-004 — Workspace Tests\n');

  await test('v1 API client uses /logistics-operational/v1 only', async () => {
    const c = readFe('services/wmsV1ApiClient.js');
    assert.ok(c.includes('/logistics-operational/v1'));
    assert.ok(!c.includes('/operations/overview'));
  });

  await test('landing + 6 operational modules in WMS-007 registry', async () => {
    const c = readFe('routes/wmsModuleRegistry.js');
    assert.ok(c.includes('WMS_LANDING_MODULE'));
    assert.ok(c.includes('dashboard'));
    for (const seg of ['warehouses', 'inventory', 'receiving', 'picking', 'shipping', 'transfers']) {
      assert.ok(c.includes(seg), `missing ${seg}`);
    }
  });

  await test('layout uses standalone ModulePage components', async () => {
    const c = readFe('pages/WmsLogisticsStandaloneRoutes.jsx');
    for (const seg of ['warehouses', 'inventory', 'receiving', 'picking', 'shipping', 'transfers']) {
      assert.ok(c.includes(seg), `missing route ${seg}`);
    }
    assert.ok(c.includes('WarehouseModulePage'));
    assert.ok(!c.includes('WmsOperationalModulePage'));
  });

  await test('dashboard aggregates v1 list APIs (no mocks)', async () => {
    const c = readFe('pages/WmsOperationalDashboardPage.jsx');
    assert.ok(c.includes('listWarehouses'));
    assert.ok(c.includes('listReceiving'));
    assert.ok(!c.includes('0.93'));
    assert.ok(!c.includes('pending_receipts: 12'));
  });

  await test('UI observability module exists', async () => {
    const c = readFe('services/wmsUiObservability.js');
    assert.ok(c.includes('logWmsUiEvent'));
  });

  await test('isolation: no direct domain/legacy access in FE', async () => {
    auditNoDirectDomainAccess();
  });

  await test('feature flags default false', async () => {
    const c = readFe('config/wmsFeatureFlags.js');
    assert.ok(c.includes('VITE_IMPETUS_LOGISTICS_ENABLED'));
    assert.ok(c.includes('false'));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
