'use strict';

/**
 * WMS-002 — Estratégia de routing por entidade (configurável via env override).
 */

const DEFAULT_ROUTING = Object.freeze({
  Warehouse: 'hybrid',
  WarehouseLocation: 'hybrid',
  StorageAddress: 'hybrid',
  InventoryItem: 'hybrid',
  InventoryBalance: 'hybrid',
  InventoryMovement: 'wms',
  ReceivingOrder: 'wms',
  PickingOrder: 'wms',
  ShippingOrder: 'wms',
  TransferOrder: 'wms',
  Container: 'wms',
  HandlingUnit: 'wms'
});

function _envOverride(entity) {
  const key = `IMPETUS_WMS_ROUTE_${String(entity).toUpperCase()}`;
  const v = process.env[key];
  if (!v) return null;
  const n = String(v).toLowerCase();
  if (['wms', 'native', 'legacy', 'hybrid'].includes(n)) {
    return n === 'native' ? 'wms' : n;
  }
  return null;
}

function resolveRoutingStrategy(entity) {
  return _envOverride(entity) || DEFAULT_ROUTING[entity] || 'wms';
}

function snapshotRoutingPolicy() {
  const out = {};
  for (const [k, v] of Object.entries(DEFAULT_ROUTING)) {
    out[k] = resolveRoutingStrategy(k);
  }
  return out;
}

module.exports = {
  DEFAULT_ROUTING,
  resolveRoutingStrategy,
  snapshotRoutingPolicy
};
