'use strict';

/**
 * SEC-01 — Security Event Bus (read-only consumers, no side effects).
 * Publicação interna apenas; consumidores não podem alterar runtime.
 */

const { createSecurityEventDto } = require('../dto/securityEventDto');

/** @type {Set<(event: object) => void>} */
const consumers = new Set();

/** @type {object[]} ring buffer recent events for audit */
const recentEvents = [];
const RECENT_MAX = 200;

function subscribe(fn) {
  if (typeof fn !== 'function') return () => {};
  consumers.add(fn);
  return () => consumers.delete(fn);
}

function publish(rawEvent) {
  const event = createSecurityEventDto(rawEvent);
  recentEvents.push(event);
  if (recentEvents.length > RECENT_MAX) recentEvents.shift();
  for (const fn of consumers) {
    try {
      fn(event);
    } catch (e) {
      try {
        const runtime = require('../observatory/securityObservatoryRuntime');
        runtime.recordError('consumer', e);
      } catch (_x) {}
    }
  }
  return event;
}

function getRecentEvents(limit = 50) {
  const n = Math.max(1, Math.min(limit, RECENT_MAX));
  return recentEvents.slice(-n);
}

function getConsumerCount() {
  return consumers.size;
}

module.exports = {
  subscribe,
  publish,
  getRecentEvents,
  getConsumerCount
};
