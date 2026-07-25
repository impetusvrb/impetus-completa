'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { loadSupplyTenantSignals } = require('../../src/domains/supply/runtime/supplyTenantSignalLoader');
const { runSupplySignalBinding } = require('../../src/domains/supply/runtime/supplySignalBindingRuntime');
const { invokeSupplyBlockBridge } = require('../../src/domains/supply/runtime/supplyBlockBridge');
const { SUPPLY_SEMANTIC_BLOCK_IDS } = require('../../src/domains/supply/registry/supplySemanticBlockRegistry');
const { getSupplyRuntimeRegistryEntry } = require('../../src/domains/supply/registry/supplyRuntimeRegistry');
const {
  logSupplySignalLoaderEvent,
  getSupplySignalLoaderLogSnapshot,
  resetSupplySignalLoaderLogForTests
} = require('../../src/domains/supply/runtime/supplySignalLoaderLogger');
const semantics = require('../../src/domains/supply/semantics/supplyCoreSemantics');
const { PURCHASE_REQUEST_STATUS } = require('../../src/domains/supply/semantics/supplyCoreSemantics');

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

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

function auditSemanticIsolation() {
  const runtimeDir = path.join(__dirname, '../../src/domains/supply/runtime');
  const loaderFiles = [
    'supplyTenantSignalLoader.js',
    'supplyBlockBridge.js',
    'supplySignalBindingRuntime.js',
    'supplySemanticSignalNormalizer.js'
  ];
  const forbiddenPatterns = [
    /require\s*\(\s*['"].*\/db['"]/,
    /require\s*\(\s*['"].*logistics-operational/,
    /operationalCompatibilityLayer/,
    /axios/,
    /fetch\s*\(/,
    /purchaseRequestService/,
    /SupplierQualificationService/,
    /applyWorkflowAction/,
    /resolveTransition/
  ];
  for (const file of loaderFiles) {
    const content = fs.readFileSync(path.join(runtimeDir, file), 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.ok(!pattern.test(content), `${file} violates isolation: ${pattern}`);
    }
  }
  const normalizer = fs.readFileSync(path.join(runtimeDir, 'supplySemanticSignalNormalizer.js'), 'utf8');
  assert.ok(normalizer.includes('supplyCoreSemantics'), 'normalizer must import supplyCoreSemantics.js');
  assert.ok(!normalizer.includes('services/'), 'normalizer must not import domain services');
}

function sampleSemanticSignals() {
  return {
    Supplier: { counts: { ACTIVE: 2, PROSPECT: 1 } },
    PurchaseRequest: { counts: { [PURCHASE_REQUEST_STATUS.DRAFT]: 1, [PURCHASE_REQUEST_STATUS.APPROVED]: 2 } },
    PurchaseOrder: { counts: { ISSUED: 1 } },
    Quotation: { counts: { RECEIVED: 3 } },
    Contract: { counts: { ACTIVE: 1 } },
    Approval: { counts: { PENDING: 2 } },
    SpendCenter: { counts: { ACTIVE: 4 } }
  };
}

(async () => {
  console.log('GF-024 — Supply Semantic Signal Loader Tests\n');
  resetSupplySignalLoaderLogForTests();

  test('registry: signal_loader ACTIVE', () => {
    const reg = getSupplyRuntimeRegistryEntry();
    assert.strictEqual(reg.planned_capabilities.signal_loader.active, true);
    assert.strictEqual(reg.planned_capabilities.signal_loader.phase, 'GF-024');
  });

  test('7 semantic pilot blocks defined', () => {
    assert.strictEqual(SUPPLY_SEMANTIC_BLOCK_IDS.length, 7);
  });

  test('semantic isolation audit: no DB/WMS/domain services in loader stack', () => {
    auditSemanticIsolation();
  });

  test('SpendCenter lifecycle in SSOT', () => {
    assert.ok(semantics.isValidStatus('SpendCenter', 'ACTIVE'));
    assert.ok(semantics.isValidStatus('SpendCenter', 'INACTIVE'));
  });

  await testAsync('missing company_id returns NO_DATASET', async () => {
    const sig = await loadSupplyTenantSignals({}, {});
    assert.strictEqual(sig.signal_readiness, 'NO_DATASET');
    assert.strictEqual(sig.ok, false);
    assert.strictEqual(sig.read_only, true);
    assert.strictEqual(sig.mock_signals, false);
  });

  await testAsync('empty ctx returns honest NO_DATASET (no DB fallback)', async () => {
    const sig = await loadSupplyTenantSignals({ company_id: 'tenant-semantic-1' }, {});
    assert.strictEqual(sig.signal_readiness, 'NO_DATASET');
    assert.strictEqual(sig.read_only, true);
    assert.strictEqual(sig.semantic_bundle, null);
    assert.ok(sig.data_sources.includes('semantic_in_memory_only'));
    assert.strictEqual(sig.event_publication, undefined);
  });

  await testAsync('semantic_signals normalize via SSOT', async () => {
    const sig = await loadSupplyTenantSignals(
      { company_id: 'tenant-semantic-2' },
      { semantic_signals: sampleSemanticSignals(), origin: 'test_fixture' }
    );
    assert.strictEqual(sig.ok, true);
    assert.strictEqual(sig.signal_readiness, 'ready');
    assert.strictEqual(sig.ssot, 'supplyCoreSemantics.js');
    assert.strictEqual(sig.read_only, true);
    assert.strictEqual(sig.semantic_bundle.entity_signal_total, 17);
    assert.ok(sig.semantic_bundle.entities.PurchaseRequest.bound);
  });

  await testAsync('invalid status rejected (semantic guard)', async () => {
    const sig = await loadSupplyTenantSignals(
      { company_id: 'tenant-bad' },
      { semantic_signals: { Supplier: { counts: { NOT_A_STATUS: 1 } } } }
    );
    assert.strictEqual(sig.ok, false);
    assert.strictEqual(sig.reason, 'semantic_normalize_error');
  });

  await testAsync('domain_events validated against catalog', async () => {
    const sig = await loadSupplyTenantSignals(
      { company_id: 'tenant-ev' },
      {
        semantic_signals: { Supplier: { counts: { ACTIVE: 1 } } },
        domain_events: [{ type: 'supply.request.created', payload: { request_id: 'r1' } }]
      }
    );
    assert.strictEqual(sig.domain_events.length, 1);
    assert.strictEqual(sig.domain_events[0].type, 'supply.request.created');
  });

  await testAsync('block bridge exposes Z.20 semantic fields', async () => {
    const sig = await loadSupplyTenantSignals(
      { company_id: 'tenant-bridge' },
      { semantic_signals: sampleSemanticSignals() }
    );
    const b = invokeSupplyBlockBridge('supply.purchase_request_queue', sig, {});
    assert.ok('binding_ok' in b);
    assert.ok('signal_count' in b);
    assert.ok('reason' in b);
    assert.strictEqual(b.read_only, true);
    assert.strictEqual(b.render_active, false);
    assert.strictEqual(b.binding_ok, true);
  });

  await testAsync('binding runtime: all 7 entities bound with semantic fixture', async () => {
    const binding = await runSupplySignalBinding(
      { company_id: 'tenant-full' },
      { semantic_signals: sampleSemanticSignals() }
    );
    assert.strictEqual(binding.inactive, true);
    assert.strictEqual(binding.read_only, true);
    assert.strictEqual(binding.binding_ratio, 1);
    assert.strictEqual(binding.bound_blocks.length, 7);
    assert.strictEqual(binding.missing_blocks.length, 0);
    assert.strictEqual(binding.event_publication, false);
    assert.strictEqual(binding.ssot, 'supplyCoreSemantics.js');
    for (const block of binding.enriched_blocks) {
      assert.strictEqual(block.shadow_signals.mode, 'semantic_read_only');
      assert.strictEqual(block.shadow_signals.phase, 'Z.20');
    }
  });

  await testAsync('empty semantic tenant: honest unbound blocks', async () => {
    const binding = await runSupplySignalBinding({ company_id: 'tenant-empty' }, {});
    assert.strictEqual(binding.binding_ratio, 0);
    assert.strictEqual(binding.bound_blocks.length, 0);
    assert.ok(binding.missing_blocks.length === 7);
    const pr = binding.missing_blocks.find((m) => m.block_id === 'supply.purchase_request_queue');
    assert.strictEqual(pr.reason, 'NO_SEMANTIC_SIGNAL');
  });

  test('logger records events without sensitive payload', () => {
    resetSupplySignalLoaderLogForTests();
    logSupplySignalLoaderEvent('TEST_EVENT', { runtime: 'supply_native', entity: 'Supplier', binding: 3 });
    const snap = getSupplySignalLoaderLogSnapshot(5);
    assert.ok(snap.length >= 1);
    const entry = snap[snap.length - 1];
    assert.strictEqual(entry.layer, 'SUPPLY_SEMANTIC_SIGNAL_LOADER');
    assert.strictEqual(entry.runtime, 'supply_native');
    assert.ok(!('password' in entry));
    assert.ok(!('payload' in entry));
  });

  test('runtime tree: no forbidden imports (supply domain)', () => {
    const root = path.join(__dirname, '../../src/domains/supply/runtime');
    const forbidden = ['require(\'../../../db\'', 'logistics-operational', 'operationalCompatibilityLayer', 'axios'];
    for (const ent of fs.readdirSync(root)) {
      if (!ent.endsWith('.js')) continue;
      const c = fs.readFileSync(path.join(root, ent), 'utf8');
      for (const token of forbidden) {
        assert.ok(!c.includes(token), `${ent}: forbidden ${token}`);
      }
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
