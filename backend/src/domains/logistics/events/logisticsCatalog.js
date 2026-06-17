'use strict';

/**
 * M1.2 — Logistics Event Catalog
 * Bounded context: industrial_logistics
 * READ ONLY / NO AUTO ACTION
 */

const LOGISTICS_EVENTS = Object.freeze([
  { type: 'logistics.inventory.updated', domain: 'logistics', critical: false, version: 1, description: 'Inventário atualizado' },
  { type: 'logistics.receipt.created', domain: 'logistics', critical: false, version: 1, description: 'Recebimento registrado' },
  { type: 'logistics.shipment.created', domain: 'logistics', critical: false, version: 1, description: 'Expedição criada' },
  { type: 'logistics.lot.registered', domain: 'logistics', critical: false, version: 1, description: 'Lote registrado' },
  { type: 'logistics.movement.recorded', domain: 'logistics', critical: false, version: 1, description: 'Movimentação registrada' },
  { type: 'logistics.stock.below_minimum', domain: 'logistics', critical: true, version: 1, description: 'Estoque abaixo do mínimo' },
  { type: 'logistics.shipment.dispatched', domain: 'logistics', critical: false, version: 1, description: 'Expedição despachada' },
  { type: 'logistics.receipt.inspected', domain: 'logistics', critical: false, version: 1, description: 'Recebimento inspecionado' }
]);

const _byType = new Map(LOGISTICS_EVENTS.map((e) => [e.type, e]));

function getLogisticsEvent(type) {
  return _byType.get(String(type || '').trim().toLowerCase()) || null;
}

function listLogisticsEvents() {
  return [...LOGISTICS_EVENTS];
}

module.exports = { LOGISTICS_EVENTS, getLogisticsEvent, listLogisticsEvents };
