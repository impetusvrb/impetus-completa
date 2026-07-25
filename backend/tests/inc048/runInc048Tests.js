'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { isInc048Enabled, snapshot } = require('../../src/integration/inc048/inc048FeatureFlags');
const { getInc048Registry } = require('../../src/integration/inc048/inc048Registry');
const { buildCompatibilityMatrix } = require('../../src/integration/inc048/inc048CompatibilityMatrix');
const { getConvergenceSnapshot, runInc048Convergence } = require('../../src/integration/inc048/inc048IntegrationRuntime');
const { resetInc048ObservabilityForTests } = require('../../src/integration/inc048/inc048Observability');
const { CONVERGENCE_FLOW } = require('../../src/integration/inc048/inc048Contracts');

const INTEGRATION_ROOT = path.join(__dirname, '../../src/integration/inc048');

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

function auditNoForbiddenImports() {
  const forbidden = [
    'operationalCompatibilityLayer',
    'warehouseLegacyAdapter',
    'routingPolicy',
    '../services/',
    'require(\'../../../db\''
  ];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.js')) {
        const c = fs.readFileSync(p, 'utf8');
        for (const token of forbidden) {
          assert.ok(!c.includes(token), `${path.relative(INTEGRATION_ROOT, p)}: forbidden ${token}`);
        }
      }
    }
  };
  walk(INTEGRATION_ROOT);
}

(async () => {
  console.log('INC-048 — Convergence Tests\n');
  resetInc048ObservabilityForTests();
  delete process.env.IMPETUS_INC048_ENABLED;

  await test('flag default false', async () => {
    assert.strictEqual(isInc048Enabled(), false);
    assert.strictEqual(snapshot().inc048_enabled, false);
  });

  await test('registry: supply + logistics + pilot', async () => {
    const reg = getInc048Registry();
    assert.strictEqual(reg.supply_runtime.runtime_id, 'supply_native');
    assert.strictEqual(reg.logistics_runtime.phase, 'WMS-004');
    assert.ok(reg.pilot_layer.contract_version);
    assert.ok(reg.public_apis.wms.base.includes('logistics-operational'));
  });

  await test('compatibility matrix all compatible', async () => {
    const m = buildCompatibilityMatrix();
    assert.ok(m.rows.length >= 10);
    assert.strictEqual(m.all_compatible, true);
  });

  await test('convergence flow 8 layers', async () => {
    assert.strictEqual(CONVERGENCE_FLOW.length, 8);
    assert.strictEqual(CONVERGENCE_FLOW[3], 'PILOT_INTEGRATION_LAYER');
    assert.strictEqual(CONVERGENCE_FLOW[5], 'WMS_PUBLIC_APIS');
  });

  await test('convergence skipped when disabled', async () => {
    const r = await runInc048Convergence({});
    assert.strictEqual(r.skipped, true);
    assert.strictEqual(r.reason, 'INC048_DISABLED');
  });

  await test('convergence runs with force_inc048', async () => {
    const r = await runInc048Convergence({
      force_inc048: true,
      mock_logistics_api: { inventory_items: [], inventory_balances: [], warehouses: [], receiving: [] }
    });
    assert.strictEqual(r.skipped, false);
    assert.strictEqual(r.ok, true);
  });

  await test('snapshot includes matrix + registry', async () => {
    const s = getConvergenceSnapshot();
    assert.ok(s.matrix);
    assert.ok(s.registry);
  });

  await test('isolation: no OCL/direct domain in integration layer', async () => {
    auditNoForbiddenImports();
  });

  await test('server mount path exists', async () => {
    const server = fs.readFileSync(path.join(__dirname, '../../src/server.js'), 'utf8');
    assert.ok(server.includes('/api/integration/inc048'));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
