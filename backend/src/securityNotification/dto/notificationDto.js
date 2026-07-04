'use strict';

/**
 * SEC-05 — Notification DTO (Centro de Comando de Incidentes).
 */

const SEVERITIES = Object.freeze(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATION']);
const PRIORITIES = Object.freeze(['P0', 'P1', 'P2', 'P3', 'P4']);
const TYPES = Object.freeze([
  'INCIDENT_ALERT',
  'THREAT_INTELLIGENCE',
  'INTEGRITY_ALERT',
  'COMBINED_INCIDENT',
  'INFORMATION'
]);

let seq = 0;

function nextNotificationId() {
  seq += 1;
  return `notif-${Date.now()}-${seq.toString(36)}`;
}

/**
 * @param {object} input
 * @returns {object}
 */
function createNotificationDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'security_notification_v1',
    notificationId: input.notificationId || nextNotificationId(),
    incidentId: input.incidentId || null,
    notificationType: TYPES.includes(input.notificationType) ? input.notificationType : 'INFORMATION',
    severity: SEVERITIES.includes(input.severity) ? input.severity : 'INFORMATION',
    priority: PRIORITIES.includes(input.priority) ? input.priority : 'P4',
    timestamp: input.timestamp || now,
    title: input.title || 'Notificação de segurança',
    summary: input.summary || '',
    details: input.details || {},
    recommendedActions: Array.isArray(input.recommendedActions) ? [...input.recommendedActions] : [],
    deliveryStatus: input.deliveryStatus || 'pending',
    channels: Array.isArray(input.channels) ? [...input.channels] : [],
    acknowledged: Boolean(input.acknowledged),
    timeline: Array.isArray(input.timeline) ? [...input.timeline] : [],
    commandCenter: input.commandCenter || emptyCommandCenter(),
    recipients: Array.isArray(input.recipients) ? [...input.recipients] : [],
    groupedEventCount: Number(input.groupedEventCount) || 1,
    deduplicationKey: input.deduplicationKey || null,
    updatedAt: input.updatedAt || now,
    createdAt: input.createdAt || now
  };
}

function emptyCommandCenter() {
  return {
    incident_classification: null,
    analysis_confidence: null,
    potential_impact: null,
    affected_assets: [],
    incident_timeline: [],
    evidence_refs: [],
    recommendations: [],
    suggested_owner: null
  };
}

function freezeNotification(n) {
  return Object.freeze(JSON.parse(JSON.stringify(n)));
}

module.exports = {
  SEVERITIES,
  PRIORITIES,
  TYPES,
  createNotificationDto,
  freezeNotification,
  nextNotificationId,
  emptyCommandCenter
};
