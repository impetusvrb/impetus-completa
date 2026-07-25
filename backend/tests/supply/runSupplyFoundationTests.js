'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { SUPPLY_RUNTIME_IDENTITY } = require('../../src/domains/supply/core/supplyRuntimeIdentity');
const { SUPPLY_CONCEPTUAL_ENTITIES } = require('../../src/domains/supply/core/supplyEntityRegistry');
const { getSupplyRuntimeRegistryEntry } = require('../../src/domains/supply/registry/supplyRuntimeRegistry');
const foundationRuntime = require('../../src/domains/supply/runtime/supplyFoundationRuntime');
const contracts = require('../../src/domains/supply/contracts/interfaces');
const eventCatalog = require('../../src/domains/supply/events/supplyEventCatalog');
const { SUPPLY_EVENT_PREFIX, isSupplyEvent } = require('../../src/domains/supply/events/supplyEventNamespace');
const integrationContracts = require('../../src/domains/supply/shared/integrationContracts');
const flags = require('../../src/domains/supply/shared/supplyFeatureFlags');
const config = require('../../src/domains/supply/config/supplyFoundationConfig');
const services = require('../../src/domains/supply/services');
const { resetSupplyObservabilityForTests, getSupplyObservabilitySnapshot } = require('../../src/domains/supply/shared/supplyObservability');
const domainRegistry = require('../../src/domains/_core/domainRegistry');
const cognitiveDomainRegistry = require('../../src/cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry');
const { FOUNDATION_RUNTIMES } = require('../architecture-conformance/baselineManifest');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

function assertNoForbiddenImportsInSupplyDomain() {
  const root = path.join(__dirname, '../../src/domains/supply');
  const forbidden = [
    'warehouseService',
    'operationalCompatibilityLayer',
    'logistics-operational/services',
    'cognitiveRuntime/domains/logistics'
  ];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.js')) {
        const content = fs.readFileSync(p, 'utf8');
        for (const token of forbidden) {
          assert.ok(!content.includes(token), `${path.relative(root, p)} forbidden ${token}`);
        }
      }
    }
  };
  walk(root);
}

(async () => {
  console.log('GF-022 — Supply Runtime Foundation Tests\n');
  resetSupplyObservabilityForTests();
  foundationRuntime.resetSupplyFoundationForTests();

  test('runtime identity: supply_native FOUNDATION v0.1.0', () => {
    assert.strictEqual(SUPPLY_RUNTIME_IDENTITY.runtime_id, 'supply_native');
    assert.strictEqual(SUPPLY_RUNTIME_IDENTITY.version, '0.1.0');
    assert.strictEqual(SUPPLY_RUNTIME_IDENTITY.status, 'FOUNDATION');
    assert.strictEqual(SUPPLY_RUNTIME_IDENTITY.domain, 'Supply');
  });

  test('domainRegistry: supply foundation entry', () => {
    const d = domainRegistry.getDomain('supply');
    assert.ok(d);
    assert.strictEqual(d.status, 'foundation');
    assert.strictEqual(d.event_prefix, 'supply.');
    assert.strictEqual(d.cognitive_runtime_id, 'supply_native');
  });

  test('cognitiveDomainRegistry: supply registered inactive', () => {
    const def = cognitiveDomainRegistry.getDomainDefinition('supply');
    assert.ok(def);
    assert.strictEqual(def.runtime_id, 'supply_native');
    assert.strictEqual(def.maturity, 'foundation');
    assert.strictEqual(def.cockpit_ready, false);
    assert.strictEqual(def.foundation_inc, 'GF-022');
  });

  test('FOUNDATION_RUNTIMES includes supply_native', () => {
    assert.ok(FOUNDATION_RUNTIMES.some((r) => r.runtime_id === 'supply_native'));
  });

  test('registry entry: planned capabilities inactive', () => {
    const entry = getSupplyRuntimeRegistryEntry();
    assert.strictEqual(entry.runtime_id, 'supply_native');
    assert.strictEqual(entry.planned_capabilities.signal_loader.active, false);
    assert.strictEqual(entry.planned_capabilities.wms_integration.mode, 'declarative_read_only');
  });

  test('canonical contracts: 6 types', () => {
    const types = contracts.listContractTypes();
    assert.strictEqual(types.length, 6);
    assert.ok(contracts.getContract('Supplier'));
    assert.ok(contracts.getContract('PurchaseOrder'));
  });

  test('event namespace supply.*', () => {
    assert.strictEqual(SUPPLY_EVENT_PREFIX, 'supply.');
    assert.ok(isSupplyEvent('supply.request.created'));
    assert.ok(!isSupplyEvent('wms.movement.posted'));
    for (const ev of eventCatalog) {
      assert.ok(isSupplyEvent(ev.type), ev.type);
    }
  });

  test('GF-022 required events present', () => {
    const types = eventCatalog.map((e) => e.type);
    assert.ok(types.includes('supply.request.created'));
    assert.ok(types.includes('supply.order.approved'));
    assert.ok(types.includes('supply.vendor.selected'));
    assert.ok(types.includes('supply.contract.updated'));
  });

  test('startup + health + observability', () => {
    const desc = foundationRuntime.startup();
    assert.strictEqual(desc.inactive, true);
    assert.strictEqual(desc.signal_loader_active, false);
    const h = foundationRuntime.health();
    assert.strictEqual(h.ok, true);
    assert.strictEqual(h.runtime_id, 'supply_native');
    const obs = getSupplyObservabilitySnapshot(5);
    assert.ok(obs.length >= 1);
  });

  test('feature flags default OFF', () => {
    const snap = flags.snapshot();
    assert.strictEqual(snap.supply_runtime_enabled, false);
    assert.strictEqual(snap.production_enabled, false);
    assert.strictEqual(snap.wms_integration_active, false);
  });

  test('integration contracts declarative — WMS inactive', () => {
    assert.strictEqual(integrationContracts.logistics_wms.active, false);
    assert.strictEqual(integrationContracts.logistics_wms.via, 'OCL');
    assert.strictEqual(integrationContracts.ppap.mode, 'read');
  });

  test('foundation config gates', () => {
    assert.strictEqual(config.allow_signal_loader, false);
    assert.strictEqual(config.allow_promotion, false);
    assert.strictEqual(config.allow_command_center, false);
  });

  test('foundation service contract — no business rules', () => {
    const c = services.getFoundationContract();
    assert.strictEqual(c.status, 'foundation');
    assert.strictEqual(c.ready, false);
    assert.strictEqual(c.business_rules, false);
  });

  test('conceptual entities registered', () => {
    assert.ok(SUPPLY_CONCEPTUAL_ENTITIES.includes('Supplier'));
    assert.ok(SUPPLY_CONCEPTUAL_ENTITIES.includes('PurchaseRequest'));
  });

  test('forbidden: no WMS direct imports in supply domain', () => {
    assertNoForbiddenImportsInSupplyDomain();
  });

  test('cognitiveRuntimeFacade unchanged — no supply payload key in facade source', () => {
    const facadePath = path.join(__dirname, '../../src/cognitiveRuntime/facade/cognitiveRuntimeFacade.js');
    const src = fs.readFileSync(facadePath, 'utf8');
    assert.ok(!src.includes('supply_cognitive_runtime'), 'GF-022 must not attach supply to dashboard/me yet');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
