'use strict';

/**
 * Adapter in-process com 3 filas de prioridade.
 *
 * - high   → entrega imediata (microtask, fora da fila)
 * - medium → fila normal, drenada via setImmediate
 * - low    → batch, drenada por intervalo de tempo curto (configurável)
 *
 * Sem persistência: ideal para MVP. Para produção, trocar por Pub/Sub via mesmo contrato.
 */

const { validateEvent } = require('../envelope');

const DEFAULT_LOW_INTERVAL_MS = 1500;

function createInMemoryAdapter(opts = {}) {
  const lowIntervalMs =
    opts.lowIntervalMs != null && Number.isFinite(opts.lowIntervalMs)
      ? Math.max(50, opts.lowIntervalMs)
      : DEFAULT_LOW_INTERVAL_MS;

  const subscribers = new Map();
  const mediumQueue = [];
  const lowQueue = [];
  let mediumDraining = false;
  let lowTimer = null;

  function _subscribersFor(type) {
    if (!subscribers.has(type)) subscribers.set(type, new Set());
    return subscribers.get(type);
  }

  async function _deliver(event) {
    const handlers = subscribers.get(event.type);
    if (!handlers || handlers.size === 0) return;
    for (const fn of [...handlers]) {
      try {
        await fn(event);
      } catch (err) {
        console.warn('[EVENT_BUS_HANDLER_ERROR]', { type: event.type, id: event.id, err: err && err.message });
      }
    }
  }

  function _drainMedium() {
    if (mediumDraining) return;
    mediumDraining = true;
    setImmediate(async () => {
      try {
        while (mediumQueue.length > 0) {
          const ev = mediumQueue.shift();
          await _deliver(ev);
        }
      } finally {
        mediumDraining = false;
      }
    });
  }

  function _ensureLowTimer() {
    if (lowTimer) return;
    lowTimer = setInterval(async () => {
      if (lowQueue.length === 0) return;
      const batch = lowQueue.splice(0, lowQueue.length);
      for (const ev of batch) {
        await _deliver(ev);
      }
    }, lowIntervalMs);
    if (typeof lowTimer.unref === 'function') lowTimer.unref();
  }

  return {
    name: 'in_memory',
    async publish(event) {
      const ev = validateEvent(event);
      if (ev.priority === 'high') {
        Promise.resolve().then(() => _deliver(ev));
        return ev.id;
      }
      if (ev.priority === 'medium') {
        mediumQueue.push(ev);
        _drainMedium();
        return ev.id;
      }
      lowQueue.push(ev);
      _ensureLowTimer();
      return ev.id;
    },
    subscribe(type, handler) {
      if (typeof handler !== 'function') {
        throw new Error('subscribe: handler deve ser função');
      }
      const set = _subscribersFor(type);
      set.add(handler);
      return () => set.delete(handler);
    },
    stats() {
      return {
        adapter: 'in_memory',
        medium_queue_size: mediumQueue.length,
        low_queue_size: lowQueue.length,
        subscribed_types: [...subscribers.keys()]
      };
    },
    /**
     * Para testes/encerramento controlado: drena tudo e desliga o timer.
     */
    async _flushAndStop() {
      while (mediumQueue.length > 0) {
        const ev = mediumQueue.shift();
        await _deliver(ev);
      }
      if (lowQueue.length > 0) {
        const batch = lowQueue.splice(0, lowQueue.length);
        for (const ev of batch) {
          await _deliver(ev);
        }
      }
      if (lowTimer) {
        clearInterval(lowTimer);
        lowTimer = null;
      }
    }
  };
}

module.exports = { createInMemoryAdapter };
