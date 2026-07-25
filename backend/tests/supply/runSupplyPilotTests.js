'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { attachSupplyPilotRuntime } = require('../../src/domains/supply/pilot/supplyPilotFacadeAttachment');
const { runSupplyPilotIntegration, validatePilotContracts } = require('../../src/domains/supply/pilot/supplyPilotIntegrationLayer');
const { runSupplyPromotion } = require('../../src/domains/supply/runtime/supplyPromotionRuntime');
const { getSupplyRuntimeRegistryEntry } = require('../../src/domains/supply/registry/supplyRuntimeRegistry');
const flags = require('../../src/domains/supply/shared/supplyFeatureFlags');
const { registerPilotTenant, resetPilotRegistryForTests } = require('../../src/domains/supply/pilot/supplyPilotRegistry');
const { resetSupplyPilotObservabilityForTests } = require('../../src/domains/supply/pilot/supplyPilotObservability');
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

function sampleSignals() {
  return {
    Supplier: { counts: { ACTIVE: 1 } },
    PurchaseRequest: { counts: { [PURCHASE_REQUEST_STATUS.APPROVED]: 1 } },
    PurchaseOrder: { counts: { ISSUED: 1 } },
    Quotation: { counts: { RECEIVED: 1 } },
    Contract: { counts: { ACTIVE: 1 } },
    Approval: { counts: { PENDING: 1 } },
    SpendCenter: { counts: { ACTIVE: 1 } }
  };
}

function auditPilotIsolation() {
  const pilotDir = path.join(__dirname, '../../src/domains/supply/pilot');
  const forbidden = [
    'logistics-operational',
    'warehouseLegacyAdapter',
    'operationalCompatibilityLayer',
    'routingPolicy',
    '/repositories/',
    'wmsOperationalApiControllers'
  ];
  for (const f of fs.readdirSync(pilotDir)) {
    if (!f.endsWith('.js')) continue;
    const c = fs.readFileSync(path.join(pilotDir, f), 'utf8');
    const localForbidden = f === 'supplyPilotPublicApiClient.js'
      ? forbidden.filter((t) => t !== 'logistics-operational')
      : forbidden;
    for (const token of localForbidden) {
      assert.ok(!c.includes(token), `${f}: forbidden ${token}`);
    }
    assert.ok(!/require\s*\([^)]*logistics-operational/.test(c), `${f}: require logistics-operational`);
  }
}

(async () => {
  console.log('GF-026 — Supply Pilot Enablement Tests\n');
  resetPilotRegistryForTests();
  resetSupplyPilotObservabilityForTests();
  delete process.env.IMPETUS_SUPPLY_PILOT_ENABLED;

  await test('registry: pilot integration ACTIVE', async () => {
    const reg = getSupplyRuntimeRegistryEntry();
    assert.strictEqual(reg.planned_capabilities.pilot_integration_layer.active, true);
    assert.strictEqual(reg.pilot_runtime.active, true);
  });

  await test('flags default false', async () => {
    const snap = flags.snapshot();
    assert.strictEqual(snap.supply_pilot_enabled, false);
    assert.strictEqual(snap.supply_cc_inbound, false);
    assert.strictEqual(snap.supply_logistics_bridge, false);
  });

  await test('pilot isolation audit', async () => {
    auditPilotIsolation();
  });

  await test('integration skipped when pilot disabled', async () => {
    const promo = await runSupplyPromotion({ company_id: 't1' }, { semantic_signals: sampleSignals() });
    const integ = await runSupplyPilotIntegration({ company_id: 't1' }, {}, promo);
    assert.strictEqual(integ.skipped, true);
    assert.strictEqual(integ.reason, 'PILOT_DISABLED');
  });

  await test('integration with force + mock logistics API', async () => {
    const promo = await runSupplyPromotion({ company_id: 't-pilot' }, { semantic_signals: sampleSignals() });
    const integ = await runSupplyPilotIntegration(
      { company_id: 't-pilot' },
      {
        force_supply_pilot: true,
        force_logistics_bridge: true,
        mock_logistics_api: {
          inventory_items: [{ item_code: 'MOCK-1', _source: 'wms' }],
          inventory_balances: [],
          warehouses: [{ code: 'WH-1' }],
          receiving: []
        }
      },
      promo
    );
    assert.strictEqual(integ.ok, true);
    assert.strictEqual(integ.logistics_bridge.active, true);
    assert.strictEqual(integ.read_only, true);
    assert.strictEqual(integ.operational_rules, false);
  });

  await test('facade attachment: supply payload keys', async () => {
    const user = { company_id: 'tenant-facade', role: 'gerente' };
    const payload = { profile_code: 'manager_supply', functional_area: 'supply' };
    const { payload: enriched, report } = await attachSupplyPilotRuntime(user, payload, {}, {
      force_supply_pilot: true,
      semantic_signals: sampleSignals(),
      mock_logistics_api: { inventory_items: [], inventory_balances: [], warehouses: [], receiving: [] }
    });
    assert.ok(enriched.supply_signal_loader);
    assert.ok(enriched.supply_cognitive_runtime);
    assert.ok(enriched.supply_cognitive_centers);
    assert.ok(enriched.supply_pilot_integration);
    assert.strictEqual(enriched.supply_cognitive_runtime.cockpit_mode, 'supply_native');
    assert.ok(report.supply_pilot.attached);
  });

  await test('contracts validation', async () => {
    const v = validatePilotContracts();
    assert.strictEqual(v.valid, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
