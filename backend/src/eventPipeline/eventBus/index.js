'use strict';

/**
 * Facade do Event Bus IMPETUS.
 *
 * Singleton com adapter trocável (in-memory por omissão; Pub/Sub/RabbitMQ no futuro).
 * Não cria ligações em tempo de require — só ao primeiro `getEventBus()`.
 */

const { createInMemoryAdapter } = require('./inMemoryAdapter');

let _adapter = null;

function _selectAdapter() {
  const kind = String(process.env.IMPETUS_EVENT_BUS_ADAPTER || 'in_memory').toLowerCase();
  if (kind === 'in_memory') {
    return createInMemoryAdapter({
      lowIntervalMs: parseInt(process.env.IMPETUS_EVENT_BUS_LOW_INTERVAL_MS || '0', 10) || undefined
    });
  }
  console.warn(
    '[EVENT_BUS] adapter desconhecido — fallback in_memory:',
    JSON.stringify({ requested: kind })
  );
  return createInMemoryAdapter();
}

function getEventBus() {
  if (_adapter) return _adapter;
  _adapter = _selectAdapter();
  return _adapter;
}

/** Apenas para testes — substitui o singleton e devolve o anterior. */
function __setEventBusForTests(custom) {
  const prev = _adapter;
  _adapter = custom;
  return prev;
}

module.exports = {
  getEventBus,
  __setEventBusForTests
};
