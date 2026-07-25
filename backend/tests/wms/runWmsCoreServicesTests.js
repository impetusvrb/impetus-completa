'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const db = require('../../src/db');
const legacyAdapter = require('../../src/domains/logistics-operational/adapters/warehouseLegacyAdapter');
const ocl = require('../../src/domains/logistics-operational/compatibility/operationalCompatibilityLayer');
const { resolveRoutingStrategy, DEFAULT_ROUTING } = require('../../src/domains/logistics-operational/compatibility/routingPolicy');
const { resetOclObservabilityForTests, getOclObservabilitySnapshot } = require('../../src/domains/logistics-operational/compatibility/oclObservability');
const services = require('../../src/domains/logistics-operational/services');

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

async function runMigrationIfNeeded() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../migrations/logistics_operational_foundation_migration.sql'),
    'utf8'
  );
  await db.query(sql);
}

async function pickCompanyId() {
  const r = await db.query('SELECT id FROM companies ORDER BY created_at LIMIT 1');
  if (!r.rows[0]) throw new Error('no company for tests');
  return r.rows[0].id;
}

function assertNoForbiddenImportsInServices() {
  const dir = path.join(__dirname, '../../src/domains/logistics-operational/services');
  const forbidden = ['warehouseService', 'warehouseIntelligence', 'require(\'../../../db\'', 'warehouse_movements'];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const token of forbidden) {
      assert.ok(!content.includes(token), `${f} contains forbidden ${token}`);
    }
  }
}

(async () => {
  console.log('WMS-002 — Core Services + OCL Tests\n');
  resetOclObservabilityForTests();

  await runMigrationIfNeeded();
  const companyId = await pickCompanyId();
  const suffix = Date.now().toString(36);

  await test('routing policy: movement = wms, inventory = hybrid', async () => {
    assert.strictEqual(resolveRoutingStrategy('InventoryMovement'), 'wms');
    assert.strictEqual(resolveRoutingStrategy('InventoryItem'), 'hybrid');
    assert.strictEqual(resolveRoutingStrategy('Warehouse'), 'hybrid');
  });

  await test('legacy adapter: listMaterials does not throw', async () => {
    const items = await legacyAdapter.listMaterials(companyId, { limit: 5 });
    assert.ok(Array.isArray(items));
  });

  await test('OCL: hybrid inventory merges sources', async () => {
    const r = await ocl.inventory.listItems(companyId, { limit: 10 });
    assert.ok(r.items);
    assert.strictEqual(r.strategy, 'hybrid');
  });

  await test('OCL: create warehouse via wms path', async () => {
    const row = await ocl.warehouses.create(companyId, {
      code: `WH-${suffix}`,
      name: 'OCL Test WH'
    });
    assert.ok(row.id);
    assert.strictEqual(row._source, 'wms');
  });

  await test('core services: warehouse create via OCL only', async () => {
    const c = services.warehouseService.getContract();
    assert.strictEqual(c.consumes, 'OCL');
    assert.strictEqual(c.ready, true);
    const row = await services.warehouseService.create(companyId, {
      code: `WS-${suffix}`,
      name: 'Service Test'
    });
    assert.ok(row.id);
  });

  await test('core services: receiving order wms native', async () => {
    const wh = await ocl.warehouses.create(companyId, { code: `RW-${suffix}`, name: 'Recv WH' });
    const order = await services.receivingService.createOrder(companyId, {
      warehouse_id: wh.id,
      order_number: `REC-${suffix}`
    });
    assert.ok(order.id);
    assert.strictEqual(order._source, 'wms');
  });

  await test('core services: movement posted wms only', async () => {
    const wh = await ocl.warehouses.create(companyId, { code: `MV-${suffix}`, name: 'Mov WH' });
    const item = await services.inventoryService.createItem(companyId, {
      item_code: `IT-${suffix}`,
      item_name: 'Test Item'
    });
    const mov = await services.movementService.create(companyId, {
      warehouse_id: wh.id,
      item_id: item.id,
      movement_type: 'adjustment',
      quantity: 10
    });
    assert.ok(mov.id);
  });

  await test('forbidden: services do not import warehouseService', async () => {
    assertNoForbiddenImportsInServices();
  });

  await test('OCL observability: logs resolution', async () => {
    await ocl.inventory.listItems(companyId, { limit: 1 });
    const entries = getOclObservabilitySnapshot(5);
    assert.ok(entries.length >= 1);
    assert.ok(entries[entries.length - 1].entity);
  });

  await test('migration stats', async () => {
    const stats = await ocl.getMigrationStats(companyId);
    assert.ok(typeof stats.legacy_materials === 'number');
    assert.ok(typeof stats.migration_percent_wms_items === 'number');
  });

  await test('DEFAULT_ROUTING documents all order entities as wms', async () => {
    assert.strictEqual(DEFAULT_ROUTING.ReceivingOrder, 'wms');
    assert.strictEqual(DEFAULT_ROUTING.PickingOrder, 'wms');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  try { await db.end?.(); } catch { /* ignore */ }
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
