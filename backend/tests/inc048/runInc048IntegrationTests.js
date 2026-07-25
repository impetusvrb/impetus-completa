'use strict';

const assert = require('assert');
const { validateCrossDomain, runInc048Convergence } = require('../../src/integration/inc048/inc048IntegrationRuntime');
const { validatePilotContracts } = require('../../src/domains/supply/pilot/supplyPilotIntegrationLayer');
const { resetInc048ObservabilityForTests } = require('../../src/integration/inc048/inc048Observability');

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
  console.log('INC-048 — Integration Tests\n');
  resetInc048ObservabilityForTests();

  await test('pilot contracts valid (GF-026 unchanged)', async () => {
    const v = validatePilotContracts();
    assert.strictEqual(v.valid, true);
  });

  await test('cross-domain validation passes', async () => {
    const r = await validateCrossDomain({ force_inc048: true });
    assert.strictEqual(r.valid, true);
    assert.strictEqual(r.issues.length, 0);
  });

  await test('promotion → pilot → convergence stack', async () => {
    const conv = await runInc048Convergence({
      force_inc048: true,
      company_id: 'inc048-tenant',
      promotion_result: { promoted_blocks: [{ block_id: 'supply.procurement' }], promotion_ratio: 0.5 },
      mock_logistics_api: { inventory_items: [], warehouses: [], inventory_balances: [], receiving: [] }
    });
    assert.strictEqual(conv.ok, true);
  });

  await test('no direct logistics domain import in integration', async () => {
    const fs = require('fs');
    const path = require('path');
    const c = fs.readFileSync(
      path.join(__dirname, '../../src/integration/inc048/inc048IntegrationRuntime.js'),
      'utf8'
    );
    assert.ok(!c.includes('domains/logistics-operational/compatibility'));
    assert.ok(!c.includes('domains/logistics-operational/repositories'));
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
