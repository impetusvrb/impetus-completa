'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { validateCrossDomain } = require('../../src/integration/inc048/inc048IntegrationRuntime');
const { buildCompatibilityMatrix } = require('../../src/integration/inc048/inc048CompatibilityMatrix');
const { CONVERGENCE_FLOW } = require('../../src/integration/inc048/inc048Contracts');

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
  console.log('INC-048 — Cross-Domain Validation Tests\n');

  await test('Supply + WMS version alignment in matrix', async () => {
    const m = buildCompatibilityMatrix();
    const pilot = m.rows.find((r) => r.component.includes('Pilot'));
    assert.ok(pilot?.compatible);
  });

  await test('cross-domain: supply homologation + wms workspace', async () => {
    const r = await validateCrossDomain({ force_inc048: true });
    const supplyCheck = r.checks.find((c) => c.id === 'supply_homologation');
    const wmsCheck = r.checks.find((c) => c.id === 'wms_workspace_phase');
    assert.strictEqual(supplyCheck.ok, true);
    assert.strictEqual(wmsCheck.ok, true);
  });

  await test('FE workspaces registered (Supply + WMS)', async () => {
    const app = fs.readFileSync(path.join(REPO, 'frontend/src/App.jsx'), 'utf8');
    assert.ok(app.includes('/app/supply/workspace'));
    assert.ok(app.includes('/app/logistics-operational/workspace'));
  });

  await test('CC exposure: supply + logistics operational', async () => {
    const cc = fs.readFileSync(
      path.join(REPO, 'frontend/src/features/dashboard/centroComando/CentroComando.jsx'),
      'utf8'
    );
    assert.ok(cc.includes('SupplyNativeCockpitPromotion'));
    assert.ok(cc.includes('WmsOperationalCcExposure'));
    assert.ok(cc.includes('LogisticsNativeCockpitPromotion'));
  });

  await test('convergence flow order preserved', async () => {
    assert.deepStrictEqual(CONVERGENCE_FLOW[0], 'SUPPLY_WORKSPACE');
    assert.deepStrictEqual(CONVERGENCE_FLOW[CONVERGENCE_FLOW.length - 1], 'WMS_OPERATIONAL_WORKSPACE');
  });

  await test('GAP-SUP and GAP-WMS-001/002 remain closed (registry phases)', async () => {
    const r = await validateCrossDomain({ force_inc048: true });
    assert.strictEqual(r.registry.supply_runtime.homologation_phase, 'GF-027');
    assert.strictEqual(r.registry.logistics_runtime.api_phase, 'WMS-003');
    assert.strictEqual(r.registry.logistics_runtime.workspace_phase, 'WMS-004');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
