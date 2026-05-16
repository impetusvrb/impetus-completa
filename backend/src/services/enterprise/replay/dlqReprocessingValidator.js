'use strict';

/**
 * ENTERPRISE READINESS — Fase 3.3
 * DLQ Reprocessing Validator
 *
 * Valida: poison isolation, retry limits, dead event quarantine, replay recovery.
 */

const MAX_RETRIES = 3;

/**
 * Motor de reprocessamento de DLQ com validação de integridade.
 */
class DlqReprocessingValidator {
  constructor(maxRetries = MAX_RETRIES) {
    this._queue = new Map(); // id → { event, retries, status }
    this._quarantine = new Map(); // id → { event, reason, quarantine_at }
    this._recovered = [];
    this._maxRetries = maxRetries;
  }

  enqueue(event, reason) {
    if (!this._queue.has(event.id)) {
      this._queue.set(event.id, { event, retries: 0, status: 'pending', dlq_reason: reason });
    }
  }

  /**
   * Tenta reprocessar todos os eventos.
   * @param {(event: object) => boolean} handler — returns true on success
   */
  reprocess(handler) {
    const toRemove = [];
    for (const [id, entry] of this._queue.entries()) {
      try {
        const ok = handler(entry.event);
        if (ok) {
          this._recovered.push(entry.event);
          toRemove.push(id);
        } else {
          entry.retries++;
          if (entry.retries >= this._maxRetries) {
            this._quarantine.set(id, { event: entry.event, reason: 'max_retries_exceeded', quarantine_at: Date.now() });
            toRemove.push(id);
          }
        }
      } catch (err) {
        entry.retries++;
        if (entry.retries >= this._maxRetries) {
          this._quarantine.set(id, { event: entry.event, reason: `exception: ${err?.message}`, quarantine_at: Date.now() });
          toRemove.push(id);
        }
      }
    }
    for (const id of toRemove) this._queue.delete(id);
    return { recovered: this._recovered.length, queue_remaining: this._queue.size, quarantined: this._quarantine.size };
  }

  /**
   * Valida integridade de quarentena: eventos quarentenados não voltam para a fila.
   */
  validateQuarantineIntegrity() {
    const qIds = new Set(this._quarantine.keys());
    const queueIds = new Set(this._queue.keys());
    const contaminated = [...qIds].filter((id) => queueIds.has(id));
    return { intact: contaminated.length === 0, contaminated };
  }

  /**
   * Valida que eventos recuperados são únicos (sem duplicados).
   */
  validateRecoveryDeduplication() {
    const ids = this._recovered.map((e) => e.id);
    const unique = new Set(ids);
    return { deduplicated: unique.size === ids.length, total: ids.length, unique: unique.size };
  }

  get stats() {
    return {
      queue_size: this._queue.size,
      quarantined: this._quarantine.size,
      recovered: this._recovered.length
    };
  }
}

module.exports = { DlqReprocessingValidator };
