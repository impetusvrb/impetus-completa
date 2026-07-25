'use strict';

/**
 * GF-024 — Normaliza sinais semânticos via supplyCoreSemantics (SSOT).
 * Proibido: objetos de negócio, BD, WMS, serviços de domínio.
 */

const semantics = require('../semantics/supplyCoreSemantics');
const { listContractTypes } = require('../contracts/interfaces');
const eventCatalog = require('../events/supplyEventCatalog');

const BINDING_ENTITY_TYPES = Object.freeze([
  'Supplier',
  'PurchaseRequest',
  'PurchaseOrder',
  'Quotation',
  'Contract',
  'Approval',
  'SpendCenter'
]);

function _normalizeStatusCounts(entityType, counts = {}) {
  const out = {};
  let total = 0;
  for (const [status, n] of Object.entries(counts)) {
    if (!semantics.isValidStatus(entityType, status)) {
      throw new Error(`SemanticSignal: invalid status ${entityType}.${status}`);
    }
    const c = Number(n) || 0;
    out[status] = c;
    total += c;
  }
  return { counts: Object.freeze(out), total };
}

function normalizeSemanticSignals(raw = {}) {
  const entities = {};
  let entitySignalTotal = 0;

  for (const entityType of BINDING_ENTITY_TYPES) {
    const slice = raw[entityType];
    if (!slice) {
      entities[entityType] = { counts: {}, total: 0, bound: false };
      continue;
    }
    const { counts, total } = _normalizeStatusCounts(entityType, slice.counts || {});
    entities[entityType] = Object.freeze({ counts, total, bound: total > 0 });
    entitySignalTotal += total;
  }

  return Object.freeze({
    entities: Object.freeze(entities),
    entity_signal_total: entitySignalTotal,
    contract_types: Object.freeze(listContractTypes()),
    event_types: Object.freeze(eventCatalog.map((e) => e.type)),
    ssot: 'supplyCoreSemantics.js',
    read_only: true
  });
}

function normalizeDomainEvents(events = []) {
  const allowed = new Set(eventCatalog.map((e) => e.type));
  const normalized = [];
  for (const ev of events) {
    const type = ev?.type;
    if (!type || !allowed.has(type)) {
      throw new Error(`SemanticSignal: event type not in catalog: ${type}`);
    }
    normalized.push(Object.freeze({ type, observed: true, payload_keys: Object.freeze(Object.keys(ev.payload || {})) }));
  }
  return Object.freeze(normalized);
}

module.exports = {
  BINDING_ENTITY_TYPES,
  normalizeSemanticSignals,
  normalizeDomainEvents
};
