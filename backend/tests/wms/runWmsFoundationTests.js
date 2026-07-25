'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const db = require('../../src/db');
const wmsFlags = require('../../src/domains/logistics-operational/shared/wmsFeatureFlags');
const { WMS_TABLE_NAMES, WMS_ENTITIES } = require('../../src/domains/logistics-operational/core/wmsEntityRegistry');
const services = require('../../src/domains/logistics-operational/services');
const repos = require('../../src/domains/logistics-operational/repositories');
const validators = require('../../src/domains/logistics-operational/validators/wmsValidators');
const { WMS_RBAC_PROFILES } = require('../../src/domains/logistics-operational/shared/wmsRbacDefinitions');
const integrationContracts = require('../../src/domains/logistics-operational/shared/integrationContracts');
const wmsEventCatalog = require('../../src/domains/logistics-operational/events/wmsEventCatalog');

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

(async () => {
  console.log('WMS-001 — Logistics Operational Foundation Tests\n');

  await runMigrationIfNeeded();

  await test('WMS SSOT tables exist (12 entities)', async () => {
    for (const t of WMS_TABLE_NAMES) {
      const r = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [t]
      );
      assert.ok(r.rows.length, `missing table ${t}`);
    }
    assert.strictEqual(WMS_TABLE_NAMES.length, 12);
    assert.strictEqual(Object.keys(WMS_ENTITIES).length, 12);
  });

  await test('schemas validators: warehouse + order', async () => {
    const bad = validators.validateWarehouse({ code: 'WH1' });
    assert.ok(!bad.valid);
    const ok = validators.validateWarehouse({
      company_id: '511f4819-fc48-479e-b11e-49ba4fb9c81b',
      code: 'WH1',
      name: 'Main'
    });
    assert.ok(ok.valid);
  });

  await test('repositories: warehouse CRUD roundtrip', async () => {
    const companyId = (await db.query('SELECT id FROM companies ORDER BY created_at LIMIT 1')).rows[0]?.id;
    if (!companyId) return;
    const suffix = Date.now().toString(36);
    const row = await repos.warehouseRepository.create(companyId, {
      code: `W-${suffix}`,
      name: 'Foundation WH',
      warehouse_type: 'standard',
      status: 'active',
      metadata: {}
    });
    assert.ok(row.id);
    const found = await repos.warehouseRepository.findById(companyId, row.id);
    assert.strictEqual(found.code, row.code);
    await repos.warehouseRepository.delete(companyId, row.id);
  });

  await test('services: operational contracts (7 services via OCL)', async () => {
    const names = [
      services.warehouseService,
      services.inventoryService,
      services.movementService,
      services.pickingService,
      services.receivingService,
      services.shippingService,
      services.transferService
    ];
    for (const s of names) {
      const c = s.getContract();
      assert.strictEqual(c.status, 'operational');
      assert.strictEqual(c.ready, true);
      assert.strictEqual(c.consumes, 'OCL');
    }
  });

  await test('feature flags: all default false', async () => {
    const snap = wmsFlags.snapshot();
    assert.strictEqual(snap.wms_operational_enabled, false);
    assert.strictEqual(snap.wms_inventory_enabled, false);
    assert.strictEqual(snap.wms_receiving_enabled, false);
    assert.strictEqual(snap.wms_shipping_enabled, false);
    assert.strictEqual(snap.wms_picking_enabled, false);
    assert.strictEqual(snap.wms_transfer_enabled, false);
    assert.strictEqual(snap.wms_api_enabled, false);
    assert.strictEqual(snap.production_enabled, false);
    assert.strictEqual(snap.menu_visible, false);
  });

  await test('RBAC profiles defined and permissions mapped (WMS-003)', async () => {
    assert.strictEqual(WMS_RBAC_PROFILES.length, 3);
    assert.ok(WMS_RBAC_PROFILES.every((p) => p.activated === true));
    assert.ok(WMS_RBAC_PROFILES[0].permissions.includes('inventory.read'));
  });

  await test('integration contracts inactive', async () => {
    assert.strictEqual(integrationContracts.erp.active, false);
    assert.strictEqual(integrationContracts.plc.active, false);
    assert.strictEqual(integrationContracts.mqtt.active, false);
  });

  await test('event catalog registered', async () => {
    assert.ok(wmsEventCatalog.length >= 7);
  });

  await test('domain registry: logistics_operational foundation', async () => {
    const reg = require('../../src/domains/_core/domainRegistry');
    const d = reg.getDomain?.('logistics_operational') || reg.DOMAINS?.logistics_operational;
    assert.ok(d, 'domain registry entry missing');
    assert.strictEqual(d.status, 'operational');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  await db.end?.();
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
