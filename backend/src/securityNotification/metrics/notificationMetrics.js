'use strict';

/**
 * SEC-05 — Notification metrics.
 */

const counters = {
  notifications_generated: 0,
  notifications_grouped: 0,
  critical_notifications: 0,
  high_notifications: 0,
  notification_latency: 0,
  delivery_attempts: 0,
  delivery_failures: 0
};

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function recordLatency(ms) {
  counters.notification_latency = ms;
}

function getSnapshot() {
  return { ...counters };
}

function resetForTests() {
  Object.keys(counters).forEach((k) => { counters[k] = 0; });
}

module.exports = { increment, recordLatency, getSnapshot, resetForTests };
