'use strict';

/**
 * SEC-05 — Notification Engine.
 * Consome SEC-02/03/04 read-only — nunca altera esses módulos.
 */

const flags = require('../config/securityNotificationFlags');
const store = require('../store/notificationStore');
const metrics = require('../metrics/notificationMetrics');
const { createNotificationDto, freezeNotification } = require('../dto/notificationDto');
const {
  resolveSeverityFromIncident,
  resolveSeverityFromThreat,
  resolveSeverityFromIntegrity,
  mapPriority,
  mapChannels,
  mapRecipientProfiles
} = require('../engine/notificationRules');
const { deduplicationKey, shouldMerge, mergeNotifications } = require('../engine/notificationAggregator');
const { buildNotificationTimeline } = require('../engine/notificationTimelineBuilder');
const { resolveRecipientsForNotification, suggestOwner } = require('../recipients/recipientProfiles');
const { deliverNotification } = require('../channels/channelRouter');

function buildCommandCenter(incident, threatProfile, integrityReport) {
  const classification = incident?.classification || threatProfile?.primaryAssessment || null;
  const severity = incident?.severity || threatProfile?.riskLevel || integrityReport?.integrityStatus;

  let potentialImpact = 'Baixo — monitorização';
  if (incident?.severity === 'CRITICAL' || threatProfile?.riskLevel === 'Critical') {
    potentialImpact = 'Alto — possível comprometimento de superfície ou credenciais';
  } else if (incident?.severity === 'HIGH' || integrityReport?.integrityStatus === 'DEGRADED') {
    potentialImpact = 'Médio — actividade suspeita ou drift de integridade';
  }

  return {
    incident_classification: classification,
    analysis_confidence: threatProfile?.confidence ?? incident?.confidence ?? null,
    potential_impact: potentialImpact,
    affected_assets: [
      ...(incident?.affectedComponents || []),
      ...(threatProfile?.affectedAssets || [])
    ].filter((v, i, a) => a.indexOf(v) === i),
    incident_timeline: buildNotificationTimeline(incident, threatProfile, integrityReport),
    evidence_refs: (incident?.evidence || []).slice(0, 20).map((e) => ({
      eventId: e.eventId,
      path: e.path_prefix,
      request_count: e.request_count
    })),
    threat_assessment: threatProfile?.primaryAssessment || null,
    integrity_status: integrityReport?.integrityStatus || null,
    integrity_score: integrityReport?.integrityScore ?? null,
    recommendations: [
      ...(threatProfile?.recommendations || []).map((r) => r.text),
      ...(integrityReport?.recommendations || []).map((r) => r.text)
    ].filter(Boolean).slice(0, 10),
    suggested_owner: suggestOwner(
      resolveSeverityFromIncident(incident),
      classification
    )
  };
}

function buildFromIncident(incident, threatProfile, integrityReport) {
  const severity = maxSeverity(
    resolveSeverityFromIncident(incident),
    threatProfile ? resolveSeverityFromThreat(threatProfile) : 'INFORMATION',
    integrityReport ? resolveSeverityFromIntegrity(integrityReport) : 'INFORMATION'
  );

  const eventCount = incident?.metrics?.requestCount || incident?.metrics?.eventCount || 1;
  const profileIds = mapRecipientProfiles(severity);
  const cc = buildCommandCenter(incident, threatProfile, integrityReport);

  const title =
    severity === 'CRITICAL'
      ? `[CRÍTICO] Incidente de segurança — ${incident?.classification || 'UNKNOWN'}`
      : `[${severity}] Incidente correlacionado — ${incident?.classification || 'UNKNOWN'}`;

  const summary =
    incident?.summary?.what_happened ||
    `Incidente ${incident?.incidentId} com ${eventCount} requests agregados`;

  return createNotificationDto({
    incidentId: incident?.incidentId,
    notificationType: threatProfile && integrityReport ? 'COMBINED_INCIDENT' : 'INCIDENT_ALERT',
    severity,
    priority: mapPriority(severity),
    title,
    summary,
    details: {
      incident: incident ? { id: incident.incidentId, severity: incident.severity, status: incident.status } : null,
      threat: threatProfile ? { id: threatProfile.threatProfileId, assessment: threatProfile.primaryAssessment } : null,
      integrity: integrityReport ? { status: integrityReport.integrityStatus, score: integrityReport.integrityScore } : null
    },
    recommendedActions: cc.recommendations,
    channels: mapChannels(severity),
    timeline: cc.incident_timeline,
    commandCenter: cc,
    recipients: resolveRecipientsForNotification(severity, profileIds),
    groupedEventCount: eventCount,
    deduplicationKey: deduplicationKey(incident?.incidentId, 'COMBINED_INCIDENT')
  });
}

function buildIntegrityOnlyNotification(integrityReport) {
  const severity = resolveSeverityFromIntegrity(integrityReport);
  const profileIds = mapRecipientProfiles(severity);

  return createNotificationDto({
    incidentId: null,
    notificationType: 'INTEGRITY_ALERT',
    severity,
    priority: mapPriority(severity),
    title: `[${severity}] Runtime Integrity — ${integrityReport.integrityStatus}`,
    summary: `Integridade: ${integrityReport.integrityStatus} (score ${integrityReport.integrityScore})`,
    details: { integrity: integrityReport },
    recommendedActions: (integrityReport.recommendations || []).map((r) => r.text),
    channels: mapChannels(severity),
    timeline: buildNotificationTimeline(null, null, integrityReport),
    commandCenter: buildCommandCenter(null, null, integrityReport),
    recipients: resolveRecipientsForNotification(severity, profileIds),
    deduplicationKey: deduplicationKey('integrity', 'INTEGRITY_ALERT')
  });
}

const SEV_ORDER = ['INFORMATION', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function maxSeverity(...severities) {
  let max = 'INFORMATION';
  for (const s of severities) {
    if (SEV_ORDER.indexOf(s) > SEV_ORDER.indexOf(max)) max = s;
  }
  return max;
}

/**
 * Processa todas as fontes SEC-02/03/04 e gera/atualiza notificações.
 */
async function processAllSources() {
  if (!flags.isSecurityNotificationCenterEnabled()) return [];

  const start = Date.now();
  const results = [];

  let incidents = [];
  let threatProfiles = [];
  let integrityReport = null;

  try {
    const sec02 = require('../../securityCorrelation');
    incidents = sec02.store.getAllIncidents();
  } catch (_e) {}

  try {
    const sec03 = require('../../securityThreatIntelligence');
    threatProfiles = sec03.store.getAllProfiles();
  } catch (_e) {}

  try {
    const sec04 = require('../../securityRuntimeIntegrity');
    integrityReport = sec04.store.getLastReport();
  } catch (_e) {}

  const threatByIncident = new Map(threatProfiles.map((p) => [p.incidentId, p]));

  for (const incident of incidents) {
    if (incident.severity === 'INFO' && incident.classification === 'HEALTH_CHECK') continue;

    const threat = threatByIncident.get(incident.incidentId) || null;
    const notification = buildFromIncident(incident, threat, null);
    const saved = await upsertAndDeliver(notification);
    if (saved) results.push(saved);
  }

  if (integrityReport && integrityReport.integrityStatus !== 'INTEGRITY_OK') {
    const notif = buildIntegrityOnlyNotification(integrityReport);
    const saved = await upsertAndDeliver(notif);
    if (saved) results.push(saved);
  }

  metrics.recordLatency(Date.now() - start);
  return results;
}

async function upsertAndDeliver(notification) {
  const key = notification.deduplicationKey;
  const existing = store.getByDeduplicationKey(key);

  let finalNotif;
  if (existing && shouldMerge(existing, notification)) {
    finalNotif = mergeNotifications(existing, notification);
    metrics.increment('notifications_grouped');
  } else {
    finalNotif = notification;
    metrics.increment('notifications_generated');
    if (finalNotif.severity === 'CRITICAL') metrics.increment('critical_notifications');
    if (finalNotif.severity === 'HIGH') metrics.increment('high_notifications');
  }

  const delivery = await deliverNotification(finalNotif);
  finalNotif.deliveryStatus = delivery.deliveryStatus;
  finalNotif.channelResults = delivery.channelResults;

  store.upsert(finalNotif);
  return freezeNotification(finalNotif);
}

module.exports = {
  processAllSources,
  buildFromIncident,
  buildIntegrityOnlyNotification,
  buildCommandCenter,
  upsertAndDeliver
};
