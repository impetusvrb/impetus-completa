'use strict';

/**
 * M1.1 — MES Event Catalog
 * Bounded context: industrial_mes
 * READ ONLY / NO AUTO ACTION
 */

const MES_EVENTS = Object.freeze([
  { type: 'mes.production_order.created', domain: 'mes', critical: false, version: 1, description: 'Ordem de produção criada' },
  { type: 'mes.production.started', domain: 'mes', critical: false, version: 1, description: 'Produção iniciada' },
  { type: 'mes.production.completed', domain: 'mes', critical: false, version: 1, description: 'Produção concluída' },
  { type: 'mes.downtime.recorded', domain: 'mes', critical: true, version: 1, description: 'Parada registrada' },
  { type: 'mes.scrap.recorded', domain: 'mes', critical: true, version: 1, description: 'Refugo registrado' },
  { type: 'mes.oee.snapshot', domain: 'mes', critical: false, version: 1, description: 'Snapshot OEE calculado' },
  { type: 'mes.traceability.registered', domain: 'mes', critical: false, version: 1, description: 'Rastreabilidade registrada' },
  { type: 'mes.production_order.cancelled', domain: 'mes', critical: false, version: 1, description: 'Ordem cancelada' },
  { type: 'mes.production_order.updated', domain: 'mes', critical: false, version: 1, description: 'Ordem atualizada' },
  { type: 'mes.shift.started', domain: 'mes', critical: false, version: 1, description: 'Turno iniciado' },
  { type: 'mes.shift.ended', domain: 'mes', critical: false, version: 1, description: 'Turno finalizado' }
]);

const _byType = new Map(MES_EVENTS.map((e) => [e.type, e]));

function getMesEvent(type) {
  return _byType.get(String(type || '').trim().toLowerCase()) || null;
}

function listMesEvents() {
  return [...MES_EVENTS];
}

module.exports = { MES_EVENTS, getMesEvent, listMesEvents };
