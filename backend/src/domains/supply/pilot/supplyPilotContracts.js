'use strict';

/**
 * GF-026 — Contratos canónicos do piloto (espelho versionado WMS-003).
 * Sem dependências directas ao domínio operacional WMS.
 */

const PILOT_CONTRACT_VERSION = '0.3.0';
const WMS_COMPATIBLE_VERSION = '0.3.0';

const WMS_CANONICAL_ENTITY_TYPES = Object.freeze([
  'Warehouse',
  'WarehouseLocation',
  'StorageAddress',
  'InventoryItem',
  'InventoryBalance',
  'InventoryMovement',
  'ReceivingOrder',
  'PickingOrder',
  'ShippingOrder',
  'TransferOrder'
]);

const SUPPLY_PILOT_BRIDGE_ENDPOINTS = Object.freeze({
  inventory_items: { path: '/v1/inventory/items', method: 'GET', contract: 'InventoryItem', producer: 'WMS_PUBLIC_API', consumer: 'SUPPLY_PILOT' },
  inventory_balances: { path: '/v1/inventory/balances', method: 'GET', contract: 'InventoryBalance', producer: 'WMS_PUBLIC_API', consumer: 'SUPPLY_PILOT' },
  warehouses: { path: '/v1/warehouses', method: 'GET', contract: 'Warehouse', producer: 'WMS_PUBLIC_API', consumer: 'SUPPLY_PILOT' },
  receiving: { path: '/v1/receiving', method: 'GET', contract: 'ReceivingOrder', producer: 'WMS_PUBLIC_API', consumer: 'SUPPLY_PILOT' }
});

const CONTRACT_EVOLUTION = Object.freeze({
  strategy: 'semver_minor_compatible',
  breaking_change_requires: 'INC + pilot_registry bump'
});

module.exports = {
  PILOT_CONTRACT_VERSION,
  WMS_COMPATIBLE_VERSION,
  WMS_CANONICAL_ENTITY_TYPES,
  SUPPLY_PILOT_BRIDGE_ENDPOINTS,
  CONTRACT_EVOLUTION
};
