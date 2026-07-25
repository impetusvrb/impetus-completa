'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const supplyFlags = require('../../src/domains/supply/shared/supplyFeatureFlags');
const { resetSupplyStoreForTests } = require('../../src/domains/supply/repositories/supplyInMemoryStore');
const { resetSupplyApiObservabilityForTests } = require('../../src/domains/supply/shared/supplyApiObservability');
const api = require('../../src/domains/supply/services/supplyApiService');
const { listContractTypes, CONTRACT_VERSION } = require('../../src/domains/supply/contracts/interfaces');

const TENANT = '00000000-0000-4000-8000-000000000099';

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

function auditNoLogisticsImports() {
  const root = path.join(__dirname, '../../src/domains/supply');
  const forbidden = [
    'logistics-operational',
    'operationalCompatibilityLayer',
    'warehouseLegacyAdapter',
    'routingPolicy'
  ];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory() && ent.name !== 'node_modules') walk(p);
      else if (ent.name.endsWith('.js')) {
        const c = fs.readFileSync(p, 'utf8');
        for (const token of forbidden) {
          assert.ok(!c.includes(token), `${path.relative(root, p)}: forbidden ${token}`);
        }
      }
    }
  };
  walk(root);
}

function auditServerMount() {
  const server = fs.readFileSync(path.join(__dirname, '../../src/server.js'), 'utf8');
  assert.ok(server.includes("'/api/supply'"), 'server must mount /api/supply');
  assert.ok(server.includes('./domains/supply/routes/supplyRoutes'), 'supply routes module');
}

(async () => {
  console.log('GF-027 — Supply REST API Tests\n');
  resetSupplyStoreForTests();
  resetSupplyApiObservabilityForTests();
  delete process.env.IMPETUS_SUPPLY_API;
  delete process.env.IMPETUS_SUPPLY_ENABLED;

  await test('feature flags: API disabled by default', async () => {
    assert.strictEqual(supplyFlags.isSupplyApiEnabled(), false);
    assert.strictEqual(supplyFlags.snapshot().phase, 'GF-027');
  });

  await test('contracts: 8 canonical types v0.2.0', async () => {
    const types = listContractTypes();
    assert.strictEqual(CONTRACT_VERSION, '0.2.0');
    assert.strictEqual(types.length, 8);
    assert.ok(types.includes('SpendCenter'));
    assert.ok(types.includes('Category'));
  });

  await test('server mount registered', async () => {
    auditServerMount();
  });

  await test('isolation: no direct logistics imports in supply domain', async () => {
    auditNoLogisticsImports();
  });

  await test('create supplier + category + spend center', async () => {
    const sup = await api.createSupplier(TENANT, { name: 'Acme Parts' });
    const cat = await api.createCategory(TENANT, { code: 'RAW', name: 'Raw Materials' });
    const sc = await api.createSpendCenter(TENANT, { code: 'SC01', name: 'Plant A' });
    assert.strictEqual(sup.type, 'Supplier');
    assert.strictEqual(cat.type, 'Category');
    assert.strictEqual(sc.type, 'SpendCenter');
  });

  await test('purchase request lifecycle via domain service', async () => {
    const pr = await api.createPurchaseRequest(TENANT, {
      buyer_id: 'buyer-1',
      items: [{ itemCode: 'BOLT-M8', description: 'Bolt M8', quantity: 100, unitPrice: 0.5 }]
    });
    assert.ok(pr.id);
    const submitted = await api.submitPurchaseRequest(TENANT, pr.id);
    assert.ok(submitted);
    const approved = await api.approvePurchaseRequest(TENANT, pr.id);
    assert.strictEqual(approved.status, 'APPROVED');
  });

  await test('purchase order + quotation + contract + approval', async () => {
    const sup = await api.createSupplier(TENANT, { name: 'Vendor X' });
    const po = await api.createPurchaseOrder(TENANT, { supplier_id: sup.id });
    const qt = await api.createQuotation(TENANT, { supplier_id: sup.id, amount: 1000 });
    const ct = await api.createContract(TENANT, { supplier_id: sup.id, valid_from: '2026-01-01' });
    const ap = await api.createApproval(TENANT, { subject_type: 'PurchaseOrder', subject_id: po.id });
    assert.strictEqual(po.type, 'PurchaseOrder');
    assert.strictEqual(qt.type, 'Quotation');
    assert.strictEqual(ct.type, 'Contract');
    assert.strictEqual(ap.type, 'Approval');
  });

  await test('pilot bridge uses integration layer (skipped when disabled)', async () => {
    const result = await api.runPilotBridge(
      { company_id: TENANT, profile_code: 'manager_supply' },
      { company_id: TENANT },
      { promoted_blocks: [] }
    );
    assert.ok(result);
    assert.strictEqual(result.skipped, true);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
