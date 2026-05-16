'use strict';

/**
 * ENTERPRISE READINESS — Fase 3.2
 * Idempotency Drill Engine
 *
 * Simula: replay duplicado, retry storms, delayed events, concurrent replay.
 */

/**
 * Motor de replay idempotente.
 * Garante que processar o mesmo evento N vezes tem efeito equivalente a 1 vez.
 */
class IdempotencyDrillEngine {
  constructor() {
    this._processed = new Map(); // id → { count, result }
    this._idempotencyViolations = [];
  }

  /**
   * Processa um evento com garantia de idempotência.
   * @param {object} event — must have .id
   * @param {(event: object) => object} handler
   */
  processIdempotent(event, handler) {
    const existing = this._processed.get(event.id);
    if (existing) {
      existing.count++;
      // Verify idempotency: same result on duplicate
      const rerun = handler(event);
      const same = JSON.stringify(rerun) === JSON.stringify(existing.result);
      if (!same) {
        this._idempotencyViolations.push({
          id: event.id,
          count: existing.count,
          original: existing.result,
          rerun
        });
      }
      return { skipped: true, count: existing.count, idempotent: same };
    }
    const result = handler(event);
    this._processed.set(event.id, { count: 1, result });
    return { skipped: false, count: 1, result };
  }

  get violations() { return this._idempotencyViolations; }
  get processedCount() { return this._processed.size; }

  /**
   * Simula retry storm: mesmo evento processado N vezes.
   * @param {object} event
   * @param {number} retries
   * @param {(event: object) => object} handler
   */
  simulateRetryStorm(event, retries, handler) {
    const results = [];
    for (let i = 0; i < retries; i++) {
      results.push(this.processIdempotent(event, handler));
    }
    const firstProcessed = results.filter((r) => !r.skipped).length;
    const skipped = results.filter((r) => r.skipped).length;
    return { total: retries, first_processed: firstProcessed, skipped, violations: this._idempotencyViolations.length };
  }

  /**
   * Simula evento atrasado que chega fora de ordem (by timestamp).
   * @param {object[]} events — sorted by payload.seq
   * @param {number} delayIndex — index to delay
   * @param {(event: object) => object} handler
   */
  simulateDelayedEvent(events, delayIndex, handler) {
    const reordered = [...events];
    const delayed = reordered.splice(delayIndex, 1)[0];
    // Process without the delayed event
    for (const ev of reordered) this.processIdempotent(ev, handler);
    // Process delayed event last (out of order)
    const delayedResult = this.processIdempotent(delayed, handler);
    return { delayed_id: delayed.id, delayed_result: delayedResult, processed_without_delay: reordered.length };
  }

  stats() {
    return {
      processed_unique: this.processedCount,
      idempotency_violations: this.violations.length,
      violation_ids: this.violations.map((v) => v.id)
    };
  }
}

module.exports = { IdempotencyDrillEngine };
