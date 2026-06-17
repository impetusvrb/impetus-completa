'use strict';

/**
 * M1.2 — Logistics Schemas
 * Bounded context: industrial_logistics
 */

const INVENTORY_RECORD_SCHEMA = {
  required: ['company_id', 'product_id', 'warehouse_id', 'quantity'],
  properties: {
    company_id: { type: 'uuid' },
    product_id: { type: 'uuid' },
    warehouse_id: { type: 'uuid' },
    location_code: { type: 'string', maxLength: 32 },
    quantity: { type: 'number', minimum: 0 },
    unit: { type: 'string', maxLength: 10 },
    lot_number: { type: 'string', maxLength: 64 },
    min_stock: { type: 'number', minimum: 0 },
    max_stock: { type: 'number', minimum: 0 }
  }
};

const WAREHOUSE_MOVEMENT_SCHEMA = {
  required: ['company_id', 'product_id', 'from_location', 'to_location', 'quantity'],
  properties: {
    company_id: { type: 'uuid' },
    product_id: { type: 'uuid' },
    from_location: { type: 'string', minLength: 1, maxLength: 64 },
    to_location: { type: 'string', minLength: 1, maxLength: 64 },
    quantity: { type: 'number', minimum: 0 },
    unit: { type: 'string', maxLength: 10 },
    lot_number: { type: 'string', maxLength: 64 },
    reason: { type: 'string', maxLength: 256 },
    operator_id: { type: 'uuid' }
  }
};

const RECEIVING_SCHEMA = {
  required: ['company_id', 'supplier_id', 'items'],
  properties: {
    company_id: { type: 'uuid' },
    supplier_id: { type: 'uuid' },
    purchase_order_ref: { type: 'string', maxLength: 64 },
    items: { type: 'array' },
    received_at: { type: 'datetime' },
    inspector_id: { type: 'uuid' },
    warehouse_id: { type: 'uuid' }
  }
};

const SHIPPING_SCHEMA = {
  required: ['company_id', 'customer_id', 'items'],
  properties: {
    company_id: { type: 'uuid' },
    customer_id: { type: 'uuid' },
    sales_order_ref: { type: 'string', maxLength: 64 },
    items: { type: 'array' },
    carrier: { type: 'string', maxLength: 128 },
    tracking_code: { type: 'string', maxLength: 128 },
    shipped_at: { type: 'datetime' },
    warehouse_id: { type: 'uuid' }
  }
};

const LOT_TRACKING_SCHEMA = {
  required: ['company_id', 'lot_number', 'product_id'],
  properties: {
    company_id: { type: 'uuid' },
    lot_number: { type: 'string', minLength: 1, maxLength: 64 },
    product_id: { type: 'uuid' },
    supplier_id: { type: 'uuid' },
    manufactured_at: { type: 'datetime' },
    expires_at: { type: 'datetime' },
    quantity: { type: 'number', minimum: 0 },
    unit: { type: 'string', maxLength: 10 },
    status: { type: 'string', enum: ['active', 'quarantine', 'expired', 'consumed'] }
  }
};

module.exports = {
  INVENTORY_RECORD_SCHEMA,
  WAREHOUSE_MOVEMENT_SCHEMA,
  RECEIVING_SCHEMA,
  SHIPPING_SCHEMA,
  LOT_TRACKING_SCHEMA
};
