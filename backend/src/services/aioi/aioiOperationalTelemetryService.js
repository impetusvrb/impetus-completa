'use strict';

/**
 * AIOI-P2.3 — Operational Telemetry Service
 *
 * Camada formal de telemetria operacional (logs estruturados + ring buffer).
 * Somente observação — zero mutação de estado operacional.
 */

const LAYER = 'AIOI_OPERATIONAL_TELEMETRY';
const MAX_EVENTS = 200;

const _eventRing = [];

function emit(event, data = {}) {
  const entry = {
    event,
    layer: LAYER,
    ts: new Date().toISOString(),
    ...data
  };

  _eventRing.push(entry);
  if (_eventRing.length > MAX_EVENTS) {
    _eventRing.shift();
  }

  console.info(`[${LAYER}] ${event}`, entry);
  return entry;
}

function emitWorkerEvent(event, data = {}) {
  return emit(event, { component: 'outbox_worker', ...data });
}

function emitHealthEvent(event, data = {}) {
  return emit(event, { component: 'health', ...data });
}

function emitMetricsEvent(event, data = {}) {
  return emit(event, { component: 'metrics', ...data });
}

function getRecentEvents(limit = 50) {
  const lim = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), MAX_EVENTS);
  return _eventRing.slice(-lim);
}

function resetEvents() {
  _eventRing.length = 0;
}

module.exports = {
  emit,
  emitWorkerEvent,
  emitHealthEvent,
  emitMetricsEvent,
  getRecentEvents,
  resetEvents,
  LAYER
};
