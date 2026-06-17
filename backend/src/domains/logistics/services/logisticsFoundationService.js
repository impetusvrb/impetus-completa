'use strict';

/**
 * M1.2 — Logistics Foundation Service
 * Bounded context: industrial_logistics
 * READ ONLY / NO AUTO ACTION — Foundation layer only.
 */

const { v4: uuidv4 } = require('uuid');
const { validatePayload } = require('../validators/logisticsValidator');
const schemas = require('../schemas/logisticsSchemas');
const { LOGISTICS_EVENTS } = require('../events/logisticsCatalog');

const LAYER = 'LOGISTICS_FOUNDATION';

function _buildCorrelationId() {
  return `logistics-${Date.now()}-${uuidv4().slice(0, 8)}`;
}

function _emitEvent(eventBus, type, payload, companyId) {
  if (!eventBus) return;
  const entry = LOGISTICS_EVENTS.find((e) => e.type === type);
  eventBus.emit('industrial.event', {
    type,
    domain: 'logistics',
    company_id: companyId,
    critical: entry?.critical ?? false,
    payload,
    correlation_id: payload.correlation_id || _buildCorrelationId(),
    emitted_at: new Date().toISOString()
  });
}

async function updateInventory(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.INVENTORY_RECORD_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO logistics_inventory (id, company_id, product_id, warehouse_id, location_code, quantity, unit, lot_number, min_stock, max_stock, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (company_id, product_id, warehouse_id, lot_number)
    DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = EXCLUDED.updated_at
  `, [id, data.company_id, data.product_id, data.warehouse_id, data.location_code || '', data.quantity, data.unit || 'un', data.lot_number || '', data.min_stock || null, data.max_stock || null, now]);

  _emitEvent(eventBus, 'logistics.inventory.updated', { id, ...data }, data.company_id);

  if (data.min_stock && data.quantity < data.min_stock) {
    _emitEvent(eventBus, 'logistics.stock.below_minimum', { id, ...data, alert: 'BELOW_MIN' }, data.company_id);
  }

  return { ok: true, id };
}

async function createReceipt(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.RECEIVING_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO logistics_receipts (id, company_id, supplier_id, purchase_order_ref, items, received_at, inspector_id, warehouse_id, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  `, [id, data.company_id, data.supplier_id, data.purchase_order_ref || null, JSON.stringify(data.items), data.received_at || now, data.inspector_id || null, data.warehouse_id || null, now]);

  _emitEvent(eventBus, 'logistics.receipt.created', { id, ...data }, data.company_id);
  return { ok: true, id };
}

async function createShipment(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.SHIPPING_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO logistics_shipments (id, company_id, customer_id, sales_order_ref, items, carrier, tracking_code, shipped_at, warehouse_id, status, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [id, data.company_id, data.customer_id, data.sales_order_ref || null, JSON.stringify(data.items), data.carrier || null, data.tracking_code || null, data.shipped_at || null, data.warehouse_id || null, 'pending', now]);

  _emitEvent(eventBus, 'logistics.shipment.created', { id, ...data }, data.company_id);
  return { ok: true, id };
}

async function registerLot(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.LOT_TRACKING_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO logistics_lot_tracking (id, company_id, lot_number, product_id, supplier_id, manufactured_at, expires_at, quantity, unit, status, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [id, data.company_id, data.lot_number, data.product_id, data.supplier_id || null, data.manufactured_at || null, data.expires_at || null, data.quantity || null, data.unit || 'un', data.status || 'active', now]);

  _emitEvent(eventBus, 'logistics.lot.registered', { id, ...data }, data.company_id);
  return { ok: true, id };
}

async function getHealth(db, companyId) {
  try {
    const [inv, receipts, shipments, lots] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS cnt FROM logistics_inventory WHERE company_id = $1`, [companyId]),
      db.query(`SELECT COUNT(*)::int AS cnt FROM logistics_receipts WHERE company_id = $1`, [companyId]),
      db.query(`SELECT COUNT(*)::int AS cnt FROM logistics_shipments WHERE company_id = $1`, [companyId]),
      db.query(`SELECT COUNT(*)::int AS cnt FROM logistics_lot_tracking WHERE company_id = $1`, [companyId])
    ]);
    return {
      ok: true,
      layer: LAYER,
      domain: 'logistics',
      company_id: companyId,
      counts: {
        inventory_records: inv.rows[0]?.cnt ?? 0,
        receipts: receipts.rows[0]?.cnt ?? 0,
        shipments: shipments.rows[0]?.cnt ?? 0,
        lots: lots.rows[0]?.cnt ?? 0
      }
    };
  } catch (err) {
    return { ok: false, layer: LAYER, error: err.message };
  }
}

module.exports = {
  LAYER,
  updateInventory,
  createReceipt,
  createShipment,
  registerLot,
  getHealth
};
