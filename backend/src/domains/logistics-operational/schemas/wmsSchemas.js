'use strict';

/**
 * WMS-001 — Schemas reutilizáveis pelas fases WMS-002+.
 */

const WAREHOUSE_SCHEMA = {
  required: ['company_id', 'code', 'name'],
  properties: {
    company_id: { type: 'uuid' },
    code: { type: 'string', minLength: 1, maxLength: 32 },
    name: { type: 'string', minLength: 1, maxLength: 128 },
    warehouse_type: { type: 'string', maxLength: 32 },
    status: { type: 'string', maxLength: 32 },
    timezone: { type: 'string', maxLength: 64 },
    metadata: { type: 'object' }
  }
};

const ADDRESS_SCHEMA = {
  required: ['company_id', 'warehouse_id', 'address_code'],
  properties: {
    company_id: { type: 'uuid' },
    warehouse_id: { type: 'uuid' },
    location_id: { type: 'uuid' },
    address_code: { type: 'string', minLength: 1, maxLength: 64 },
    address_type: { type: 'string', maxLength: 32 },
    pick_sequence: { type: 'number' },
    max_weight_kg: { type: 'number', minimum: 0 },
    status: { type: 'string', maxLength: 32 },
    metadata: { type: 'object' }
  }
};

const ITEM_SCHEMA = {
  required: ['company_id', 'item_code', 'item_name'],
  properties: {
    company_id: { type: 'uuid' },
    item_code: { type: 'string', minLength: 1, maxLength: 64 },
    item_name: { type: 'string', minLength: 1, maxLength: 256 },
    uom: { type: 'string', maxLength: 16 },
    item_class: { type: 'string', maxLength: 64 },
    lot_controlled: { type: 'boolean' },
    serial_controlled: { type: 'boolean' },
    metadata: { type: 'object' }
  }
};

const STOCK_SCHEMA = {
  required: ['company_id', 'warehouse_id', 'item_id', 'quantity'],
  properties: {
    company_id: { type: 'uuid' },
    warehouse_id: { type: 'uuid' },
    address_id: { type: 'uuid' },
    item_id: { type: 'uuid' },
    lot_number: { type: 'string', maxLength: 64 },
    quantity: { type: 'number', minimum: 0 },
    reserved_quantity: { type: 'number', minimum: 0 },
    uom: { type: 'string', maxLength: 16 },
    status: { type: 'string', maxLength: 32 }
  }
};

const MOVEMENT_SCHEMA = {
  required: ['company_id', 'warehouse_id', 'item_id', 'movement_type', 'quantity'],
  properties: {
    company_id: { type: 'uuid' },
    warehouse_id: { type: 'uuid' },
    item_id: { type: 'uuid' },
    movement_type: { type: 'string', maxLength: 32 },
    quantity: { type: 'number' },
    uom: { type: 'string', maxLength: 16 },
    from_address_id: { type: 'uuid' },
    to_address_id: { type: 'uuid' },
    lot_number: { type: 'string', maxLength: 64 },
    reference_type: { type: 'string', maxLength: 64 },
    reference_id: { type: 'uuid' },
    status: { type: 'string', maxLength: 32 },
    metadata: { type: 'object' }
  }
};

const ORDER_SCHEMA = {
  required: ['company_id', 'warehouse_id', 'order_number'],
  properties: {
    company_id: { type: 'uuid' },
    warehouse_id: { type: 'uuid' },
    order_number: { type: 'string', minLength: 1, maxLength: 64 },
    status: { type: 'string', maxLength: 32 },
    metadata: { type: 'object' }
  }
};

module.exports = {
  WAREHOUSE_SCHEMA,
  ADDRESS_SCHEMA,
  ITEM_SCHEMA,
  STOCK_SCHEMA,
  MOVEMENT_SCHEMA,
  ORDER_SCHEMA
};
