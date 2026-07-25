'use strict';

/**
 * WMS-001 — Catálogo de eventos (sem emissão activa nesta fase).
 */

module.exports = Object.freeze([
  { type: 'wms.warehouse.created', domain: 'logistics-operational', critical: false },
  { type: 'wms.inventory.balance_changed', domain: 'logistics-operational', critical: false },
  { type: 'wms.movement.posted', domain: 'logistics-operational', critical: false },
  { type: 'wms.receiving.order_created', domain: 'logistics-operational', critical: false },
  { type: 'wms.picking.order_created', domain: 'logistics-operational', critical: false },
  { type: 'wms.shipping.order_created', domain: 'logistics-operational', critical: false },
  { type: 'wms.transfer.order_created', domain: 'logistics-operational', critical: false }
]);
