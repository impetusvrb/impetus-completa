'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { runSupplyPromotion } = require('../../src/domains/supply/runtime/supplyPromotionRuntime');
const { runSupplySignalBinding } = require('../../src/domains/supply/runtime/supplySignalBindingRuntime');
const { resolvePromotableBlocks } = require('../../src/domains/supply/runtime/supplyCognitiveBlockResolver');
const { evaluatePromotionPolicy, REJECTION_REASONS } = require('../../src/domains/supply/runtime/supplyPromotionPolicy');
const { getSupplyRuntimeRegistryEntry } = require('../../src/domains/supply/registry/supplyRuntimeRegistry');
const { getSupplyCommandCenterRegistry } = require('../../src/domains/supply/cognitive/supplyCommandCenterRegistry');
const { buildSupplyCommandCenterFoundation } = require('../../src/domains/supply/cognitive/supplyCommandCenterRuntime');
const {
  getPromotionMetricsSnapshot,
  resetPromotionMetricsForTests
} = require('../../src/domains/supply/runtime/supplyPromotionMetrics');
const {
  getSupplyPromotionLogSnapshot,
  resetSupplyPromotionLogForTests
} = require('../../src/domains/supply/runtime/supplyPromotionLogger');
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

function sampleSemanticSignals() {
  return {
    Supplier: { counts: { ACTIVE: 2 } },
    PurchaseRequest: { counts: { [PURCHASE_REQUEST_STATUS.APPROVED]: 1 } },
    PurchaseOrder: { counts: { ISSUED: 1 } },
    Quotation: { counts: { RECEIVED: 1 } },
    Contract: { counts: { ACTIVE: 1 } },
    Approval: { counts: { PENDING: 1 } },
    SpendCenter: { counts: { ACTIVE: 1 } }
  };
}

function auditPromotionIsolation() {
  const dirs = [
    path.join(__dirname, '../../src/domains/supply/runtime'),
    path.join(__dirname, '../../src/domains/supply/cognitive')
  ];
  const forbidden = [
    'require(\'../../../db\'',
    'logistics-operational',
    'operationalCompatibilityLayer',
    'warehouse_',
    'purchaseRequestService',
    'axios',
    'fetch('
  ];
  const files = [
    'supplyPromotionRuntime.js',
    'supplyPromotionPolicy.js',
    'supplyCognitiveBlockResolver.js',
    'supplyCommandCenterRuntime.js'
  ];
  for (const file of files) {
    const p = path.join(dirs[0], file);
    const p2 = path.join(dirs[1], file);
    const target = fs.existsSync(p) ? p : p2;
    const c = fs.readFileSync(target, 'utf8');
    for (const token of forbidden) {
      assert.ok(!c.includes(token), `${file}: forbidden ${token}`);
    }
  }
  const resolver = fs.readFileSync(
    path.join(dirs[0], 'supplyCognitiveBlockResolver.js'),
    'utf8'
  );
  assert.ok(!resolver.includes('services/'), 'resolver must not import domain services');
}

(async () => {
  console.log('GF-025 — Supply Promotion & CC Foundation Tests (REV-001)\n');
  resetPromotionMetricsForTests();
  resetSupplyPromotionLogForTests();

  test('registry: promotion ACTIVE, command_center FOUNDATION', () => {
    const reg = getSupplyRuntimeRegistryEntry();
    assert.strictEqual(reg.planned_capabilities.promotion.active, true);
    assert.strictEqual(reg.planned_capabilities.command_center.active, true);
    assert.strictEqual(reg.planned_capabilities.command_center.status, 'FOUNDATION');
  });

  test('7 cognitive centers registered (GF-021)', () => {
    assert.strictEqual(getSupplyCommandCenterRegistry().length, 7);
  });

  test('REV-001 isolation audit', () => {
    auditPromotionIsolation();
  });

  test('policy rejects zero signal block', () => {
    const d = evaluatePromotionPolicy(
      { block_id: 'supply.supplier_registry', integrity_ok: true, binding_ok: true, signal_count: 0 },
      { promotion_enabled: true }
    );
    assert.strictEqual(d.allowed, false);
    assert.strictEqual(d.reason, REJECTION_REASONS.ZERO_SIGNAL);
  });

  test('policy allows bound cognitive block', () => {
    const d = evaluatePromotionPolicy(
      {
        block_id: 'supply.supplier_registry',
        integrity_ok: true,
        binding_ok: true,
        signal_count: 3,
        entity: 'Supplier'
      },
      { promotion_enabled: true }
    );
    assert.strictEqual(d.allowed, true);
    assert.ok(d.explain);
  });

  await testAsync('resolver deduplicates and validates integrity', async () => {
    const binding = await runSupplySignalBinding(
      { company_id: 'tenant-promo' },
      { semantic_signals: sampleSemanticSignals() }
    );
    const resolved = resolvePromotableBlocks(binding);
    assert.strictEqual(resolved.total, 7);
    assert.strictEqual(resolved.duplicates_skipped.length, 0);
    for (const b of resolved.cognitive_blocks) {
      assert.strictEqual(b.source, 'semantic_block_bridge');
      assert.strictEqual(b.integrity_ok, true);
    }
  });

  await testAsync('promotion runtime: 7 blocks promoted with semantic fixture', async () => {
    const result = await runSupplyPromotion(
      { company_id: 'tenant-promo-full' },
      { semantic_signals: sampleSemanticSignals() }
    );
    assert.strictEqual(result.rev_conformant, true);
    assert.strictEqual(result.promotion_applied, true);
    assert.strictEqual(result.promotion_ratio, 1);
    assert.strictEqual(result.promoted_blocks.length, 7);
    assert.strictEqual(result.read_only, true);
    assert.strictEqual(result.event_publication, false);
    assert.strictEqual(result.database_mutations, false);
    assert.strictEqual(result.centers_count, 7);
    assert.ok(result.supply_command_center_foundation);
    assert.strictEqual(result.supply_command_center_foundation.status, 'FOUNDATION');
    for (const p of result.promoted_blocks) {
      assert.strictEqual(p.promotion_status, 'PROMOTED');
      assert.strictEqual(p.render_active, false);
    }
  });

  await testAsync('empty tenant: honest rejection, no promotion', async () => {
    const result = await runSupplyPromotion({ company_id: 'tenant-empty-promo' }, {});
    assert.strictEqual(result.promotion_applied, false);
    assert.strictEqual(result.promotion_ratio, 0);
    assert.ok(result.rejected_blocks.length >= 1);
  });

  test('metrics: success and failure rates', () => {
    const m = getPromotionMetricsSnapshot();
    assert.ok('promotion_success_rate' in m);
    assert.ok('promotion_failure_rate' in m);
    assert.ok(m.runs >= 1);
  });

  test('command center foundation assigns promoted blocks to centers', () => {
    const foundation = buildSupplyCommandCenterFoundation({
      promotion_applied: true,
      promotion_ratio: 1,
      promoted_blocks: [
        {
          block_id: 'supply.supplier_registry',
          promotion_status: 'PROMOTED',
          signal_count: 2,
          entity: 'Supplier'
        }
      ]
    });
    const perf = foundation.supply_cognitive_centers.find(
      (c) => c.center_id === 'supply.center.supplier_performance'
    );
    assert.strictEqual(perf.promoted_count, 1);
    assert.strictEqual(foundation.operational_logic, false);
  });

  test('promotion logger: no sensitive fields', () => {
    const snap = getSupplyPromotionLogSnapshot(10);
    assert.ok(snap.length >= 1);
    for (const e of snap) {
      assert.ok(!('password' in e));
      assert.ok(!('payload' in e));
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
