'use strict';

const assert = require('assert');
const { runSupplyPilotIntegration } = require('../../src/domains/supply/pilot/supplyPilotIntegrationLayer');
const { fetchPublicOperationalEndpoint } = require('../../src/domains/supply/pilot/supplyPilotPublicApiClient');
const { runSupplyPromotion } = require('../../src/domains/supply/runtime/supplyPromotionRuntime');
const { consolidateSupplyPilotCockpit } = require('../../src/domains/supply/pilot/supplyPilotCockpitConsolidation');
const { PURCHASE_REQUEST_STATUS } = require('../../src/domains/supply/semantics/supplyCoreSemantics');

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

function signals() {
  return {
    Supplier: { counts: { ACTIVE: 1 } },
    PurchaseRequest: { counts: { [PURCHASE_REQUEST_STATUS.DRAFT]: 1 } },
    PurchaseOrder: { counts: { ISSUED: 1 } },
    Quotation: { counts: { RECEIVED: 1 } },
    Contract: { counts: { ACTIVE: 1 } },
    Approval: { counts: { PENDING: 1 } },
    SpendCenter: { counts: { ACTIVE: 1 } }
  };
}

(async () => {
  console.log('GF-026 — Pilot Integration Layer Tests\n');

  await test('public API client uses mock without HTTP', async () => {
    const r = await fetchPublicOperationalEndpoint('warehouses', {
      mock_logistics_api: { warehouses: [{ code: 'X' }] }
    });
    assert.strictEqual(r.mock, true);
    assert.strictEqual(r.contract, 'Warehouse');
  });

  await test('full stack: promotion → integration → consolidation', async () => {
    const promo = await runSupplyPromotion(
      { company_id: 't-stack' },
      { semantic_signals: signals() }
    );
    const integ = await runSupplyPilotIntegration(
      { company_id: 't-stack' },
      { force_supply_pilot: true, semantic_signals: signals() },
      promo
    );
    const cc = consolidateSupplyPilotCockpit(promo, integ);
    assert.strictEqual(cc.consolidation_applied, true);
    assert.strictEqual(cc.centers_count, 7);
    assert.strictEqual(cc.operational_logic, false);
    assert.strictEqual(cc.read_only, true);
  });

  await test('bridge skipped without flag', async () => {
    const promo = await runSupplyPromotion({ company_id: 't2' }, { semantic_signals: signals() });
    const integ = await runSupplyPilotIntegration(
      { company_id: 't2' },
      { force_supply_pilot: true },
      promo
    );
    assert.strictEqual(integ.logistics_bridge.active, false);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
