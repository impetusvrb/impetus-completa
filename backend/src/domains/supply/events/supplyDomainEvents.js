'use strict';

const { buildSupplyEventType } = require('./supplyEventNamespace');

function createDomainEvent(type, payload = {}) {
  const normalized = buildSupplyEventType(type);
  return Object.freeze({
    type: normalized,
    payload: Object.freeze({ ...payload, emitted_at: new Date().toISOString() }),
    contract_only: false,
    phase: 'GF-023'
  });
}

function createEventContract(type, payloadSchema = []) {
  return Object.freeze({
    type: buildSupplyEventType(type),
    payloadSchema: Object.freeze(payloadSchema),
    processing: false,
    phase: 'GF-023'
  });
}

module.exports = { createDomainEvent, createEventContract };
