'use strict';
/**
 * IntegrityEventBus — INT-01B / INT-DEDUP-001
 * Fila FIFO interna com deduplicação e limite de memória.
 * Sem comunicação externa — Shadow Mode only.
 *
 * Dedup key (INT-DEDUP-001 / OBS-003-F1):
 *   path::event_type[::changed_attribute]
 * O sufixo changed_attribute só entra quando presente (ex.: UID vs GID),
 * preservando a chave histórica path::event_type para os restantes tipos.
 */

const EventEmitter = require('events');

const MAX_QUEUE    = 1000;
const DEDUP_WINDOW = 30 * 1000; // 30 segundos

let _seqCounter = 0;
function nextSeq() { return ++_seqCounter; }

/**
 * Constrói a chave de deduplicação.
 * @param {object} rawEvent
 * @returns {string}
 */
function buildDedupKey(rawEvent) {
  const path = rawEvent.asset_path || '';
  const type = rawEvent.event_type || '';
  const attr = rawEvent.changed_attribute;
  if (attr !== undefined && attr !== null && String(attr).length > 0) {
    return `${path}::${type}::${attr}`;
  }
  return `${path}::${type}`;
}

class IntegrityEventBus extends EventEmitter {
  constructor() {
    super();
    this._queue  = [];       // FIFO de eventos enriquecidos
    this._dedup  = new Map(); // chave → timestamp last seen
    this._stats  = { emitted: 0, deduplicated: 0, discarded: 0 };
  }

  /**
   * Emite um evento de integridade.
   * @param {object} rawEvent
   */
  emit(rawEvent) {
    const key    = buildDedupKey(rawEvent);
    const now    = Date.now();

    // Deduplicação: suprimir se mesma chave semântica nos últimos 30s
    const lastSeen = this._dedup.get(key);
    if (lastSeen && now - lastSeen < DEDUP_WINDOW) {
      this._stats.deduplicated++;
      return false;
    }
    this._dedup.set(key, now);

    // Limpeza periódica do mapa de deduplicação
    if (this._dedup.size > 2000) {
      for (const [k, ts] of this._dedup) {
        if (now - ts > DEDUP_WINDOW * 2) this._dedup.delete(k);
      }
    }

    // Enriquece com metadados do bus
    const event = {
      event_id:         `int-${formatDate(now)}-${String(nextSeq()).padStart(4, '0')}`,
      schema_version:   '1.0',
      timestamp:        new Date(now).toISOString(),
      timestamp_mono:   now,
      ...rawEvent,
    };

    // Descarte seguro quando fila cheia
    if (this._queue.length >= MAX_QUEUE) {
      this._queue.shift(); // descarta o mais antigo
      this._stats.discarded++;
    }

    this._queue.push(event);
    this._stats.emitted++;

    // Notificar ouvintes (para o CorrelationEngine)
    super.emit('integrity_event', event);
    return true;
  }

  /** Devolve e remove o próximo evento da fila (modo poll). */
  dequeue() {
    return this._queue.shift() || null;
  }

  /** Devolve todos os eventos pendentes sem remover. */
  peek(count = 10) {
    return this._queue.slice(0, count);
  }

  size()       { return this._queue.length; }
  getStats()   { return { ...this._stats, queue_size: this._queue.length }; }
  clearDedup() { this._dedup.clear(); }
}

function formatDate(ts) {
  const d = new Date(ts);
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
    String(d.getUTCHours()).padStart(2, '0'),
    String(d.getUTCMinutes()).padStart(2, '0'),
    String(d.getUTCSeconds()).padStart(2, '0'),
  ].join('');
}

module.exports = IntegrityEventBus;
module.exports.buildDedupKey = buildDedupKey;
module.exports.DEDUP_WINDOW = DEDUP_WINDOW;
