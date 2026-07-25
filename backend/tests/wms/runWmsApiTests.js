'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const db = require('../../src/db');
const ocl = require('../../src/domains/logistics-operational/compatibility/operationalCompatibilityLayer');
const wmsFlags = require('../../src/domains/logistics-operational/shared/wmsFeatureFlags');
const { resetWmsApiObservabilityForTests } = require('../../src/domains/logistics-operational/shared/wmsApiObservability');
const { resetOclObservabilityForTests } = require('../../src/domains/logistics-operational/compatibility/oclObservability');

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
  if (!r.rows[0]) throw new Error('no company');
  return r.rows[0].id;
}

function auditControllersUseOclOnly() {
  const file = path.join(
    __dirname,
    '../../src/domains/logistics-operational/controllers/wmsOperationalApiControllers.js'
  );
  const c = fs.readFileSync(file, 'utf8');
  assert.ok(c.includes('operationalCompatibilityLayer'), 'must import OCL');
  assert.ok(!c.includes('../services'), 'must not import services');
  assert.ok(!c.includes('require(\'../../../db\''), 'must not import db');
  assert.ok(!c.includes('logistics-operational'), 'no self ref');
  assert.ok(!c.includes('domains/supply'), 'no supply import');
}

function auditNoSupplyCoupling() {
  const root = path.join(__dirname, '../../src/domains/logistics-operational');
  const forbidden = ['domains/supply', 'supply_native', 'supplyPromotion'];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
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

(async () => {
  console.log('WMS-003 — Operational API Tests (REV-001)\n');
  resetWmsApiObservabilityForTests();
  resetOclObservabilityForTests();

  await test('feature flags: API disabled by default', async () => {
    delete process.env.IMPETUS_WMS_API_ENABLED;
    const snap = wmsFlags.snapshot();
    assert.strictEqual(snap.wms_api_enabled, false);
    assert.strictEqual(snap.logistics_api_enabled, false);
    assert.strictEqual(snap.inventory_api_enabled, false);
    assert.strictEqual(snap.menu_visible, false);
  });

  test('controllers: OCL-only audit', () => {
    auditControllersUseOclOnly();
  });

  test('REV-001: no Supply coupling in logistics-operational', () => {
    auditNoSupplyCoupling();
  });

  await runMigrationIfNeeded();
  const companyId = await pickCompanyId();
  const suffix = Date.now().toString(36);

  await test('OCL API complement: warehouse CRUD + capacity', async () => {
    const wh = await ocl.warehouses.create(companyId, { code: `WH-${suffix}`, name: 'API WH' });
    const got = await ocl.warehousesApi.getById(companyId, wh.id);
    assert.strictEqual(got.id, wh.id);
    const cap = await ocl.warehousesApi.getCapacity(companyId, wh.id);
    assert.strictEqual(cap.warehouse_id, wh.id);
    await db.query('DELETE FROM wms_warehouses WHERE id = $1', [wh.id]);
  });

  await test('OCL API complement: inventory + movements history', async () => {
    const item = await ocl.inventory.createItem(companyId, {
      item_code: `IT-${suffix}`,
      item_name: 'API Item'
    });
    const got = await ocl.inventoryApi.getItemById(companyId, item.id);
    assert.strictEqual(got.item_code, item.item_code);
    const wh = await ocl.warehouses.create(companyId, { code: `WH2-${suffix}`, name: 'M WH' });
    const mov = await ocl.movements.create(companyId, {
      warehouse_id: wh.id,
      item_id: item.id,
      movement_type: 'receipt',
      quantity: 10
    });
    const movGot = await ocl.movementsApi.getById(companyId, mov.id);
    assert.strictEqual(movGot.id, mov.id);
    await db.query('DELETE FROM wms_inventory_movements WHERE id = $1', [mov.id]);
    await db.query('DELETE FROM wms_inventory_items WHERE id = $1', [item.id]);
    await db.query('DELETE FROM wms_warehouses WHERE id = $1', [wh.id]);
  });

  await test('OCL API complement: receiving status update', async () => {
    const wh = await ocl.warehouses.create(companyId, { code: `WH3-${suffix}`, name: 'R WH' });
    const ord = await ocl.receiving.createOrder(companyId, {
      warehouse_id: wh.id,
      order_number: `RCV-${suffix}`
    });
    const updated = await ocl.receivingApi.updateStatus(companyId, ord.id, 'completed');
    assert.strictEqual(updated.status, 'completed');
    await db.query('DELETE FROM wms_receiving_orders WHERE id = $1', [ord.id]);
    await db.query('DELETE FROM wms_warehouses WHERE id = $1', [wh.id]);
  });

  await test('OCL API complement: picking execute + complete', async () => {
    const wh = await ocl.warehouses.create(companyId, { code: `WH4-${suffix}`, name: 'P WH' });
    const ord = await ocl.picking.createOrder(companyId, {
      warehouse_id: wh.id,
      order_number: `PICK-${suffix}`
    });
    const exec = await ocl.pickingApi.execute(companyId, ord.id);
    assert.strictEqual(exec.status, 'picking');
    const done = await ocl.pickingApi.complete(companyId, ord.id);
    assert.strictEqual(done.status, 'completed');
    await db.query('DELETE FROM wms_picking_orders WHERE id = $1', [ord.id]);
    await db.query('DELETE FROM wms_warehouses WHERE id = $1', [wh.id]);
  });

  await test('OCL API complement: shipping dispatch + transfer complete', async () => {
    const wh = await ocl.warehouses.create(companyId, { code: `WH5-${suffix}`, name: 'S WH' });
    const wh2 = await ocl.warehouses.create(companyId, { code: `WH6-${suffix}`, name: 'S WH2' });
    const ship = await ocl.shipping.createOrder(companyId, {
      warehouse_id: wh.id,
      order_number: `SHP-${suffix}`
    });
    const dispatched = await ocl.shippingApi.dispatch(companyId, ship.id);
    assert.strictEqual(dispatched.status, 'shipped');
    const xfer = await ocl.transfers.createOrder(companyId, {
      from_warehouse_id: wh.id,
      to_warehouse_id: wh2.id,
      order_number: `XFR-${suffix}`
    });
    const completed = await ocl.transfersApi.complete(companyId, xfer.id);
    assert.strictEqual(completed.status, 'received');
    await db.query('DELETE FROM wms_shipping_orders WHERE id = $1', [ship.id]);
    await db.query('DELETE FROM wms_transfer_orders WHERE id = $1', [xfer.id]);
    await db.query('DELETE FROM wms_warehouses WHERE id = $1', [wh.id]);
    await db.query('DELETE FROM wms_warehouses WHERE id = $1', [wh2.id]);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  await db.end?.();
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
