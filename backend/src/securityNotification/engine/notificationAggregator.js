'use strict';

/**
 * SEC-05 — Agregação e deduplicação de notificações.
 */

const flags = require('../config/securityNotificationFlags');

/**
 * Chave de deduplicação — 1 incidente → 1 notificação consolidada.
 */
function deduplicationKey(incidentId, notificationType) {
  return `${incidentId || 'global'}::${notificationType}`;
}

function shouldMerge(existing, incoming) {
  if (!existing) return false;
  const windowMs = flags.deduplicationWindowMs();
  const lastUpdate = new Date(existing.updatedAt || existing.timestamp).getTime();
  const now = Date.now();
  if (now - lastUpdate > windowMs) return false;
  return existing.deduplicationKey === incoming.deduplicationKey;
}

function mergeNotifications(existing, incoming) {
  return {
    ...existing,
    timestamp: existing.timestamp,
    updatedAt: incoming.timestamp,
    summary: incoming.summary,
    details: { ...existing.details, ...incoming.details },
    recommendedActions: [...new Set([...(existing.recommendedActions || []), ...(incoming.recommendedActions || [])])],
    timeline: mergeTimelines(existing.timeline, incoming.timeline),
    commandCenter: { ...existing.commandCenter, ...incoming.commandCenter },
    groupedEventCount: (existing.groupedEventCount || 1) + (incoming.groupedEventCount || 1),
    severity: maxSeverity(existing.severity, incoming.severity),
    priority: minPriority(existing.priority, incoming.priority),
    deliveryStatus: 'pending',
    channels: [...new Set([...(existing.channels || []), ...(incoming.channels || [])])]
  };
}

function mergeTimelines(a, b) {
  const map = new Map();
  for (const item of [...(a || []), ...(b || [])]) {
    const key = `${item.phase}-${item.timestamp}`;
    map.set(key, item);
  }
  return [...map.values()].sort((x, y) => new Date(x.timestamp) - new Date(y.timestamp));
}

const SEV_ORDER = ['INFORMATION', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PRI_ORDER = ['P4', 'P3', 'P2', 'P1', 'P0'];

function maxSeverity(a, b) {
  return SEV_ORDER[Math.max(SEV_ORDER.indexOf(a), SEV_ORDER.indexOf(b))] || a;
}

function minPriority(a, b) {
  return PRI_ORDER[Math.max(PRI_ORDER.indexOf(a), PRI_ORDER.indexOf(b))] || a;
}

module.exports = {
  deduplicationKey,
  shouldMerge,
  mergeNotifications,
  maxSeverity,
  minPriority
};
