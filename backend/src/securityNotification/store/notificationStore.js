'use strict';

/**
 * SEC-05 — Notification store (in-memory).
 */

const flags = require('../config/securityNotificationFlags');

/** @type {Map<string, object>} notificationId -> notification */
const byId = new Map();

/** @type {Map<string, string>} deduplicationKey -> notificationId */
const byDedupKey = new Map();

function upsert(notification) {
  if (byId.size >= flags.maxStoredNotifications()) {
    evictOldest();
  }
  byId.set(notification.notificationId, notification);
  if (notification.deduplicationKey) {
    byDedupKey.set(notification.deduplicationKey, notification.notificationId);
  }
  return notification;
}

function evictOldest() {
  const sorted = [...byId.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const oldest = sorted[0];
  if (oldest) {
    byId.delete(oldest.notificationId);
    if (oldest.deduplicationKey) byDedupKey.delete(oldest.deduplicationKey);
  }
}

function getById(id) {
  return byId.get(id) || null;
}

function getByDeduplicationKey(key) {
  const id = byDedupKey.get(key);
  return id ? byId.get(id) : null;
}

function getAll() {
  return [...byId.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function getPending() {
  return getAll().filter((n) => !n.acknowledged && n.deliveryStatus !== 'failed');
}

function acknowledge(id) {
  const n = byId.get(id);
  if (n) {
    n.acknowledged = true;
    n.updatedAt = new Date().toISOString();
  }
  return n;
}

function resetForTests() {
  byId.clear();
  byDedupKey.clear();
}

module.exports = {
  upsert,
  getById,
  getByDeduplicationKey,
  getAll,
  getPending,
  acknowledge,
  resetForTests
};
