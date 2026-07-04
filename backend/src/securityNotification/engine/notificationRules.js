'use strict';

/**
 * SEC-05 — Regras determinísticas de notificação por severidade.
 */

const SEVERITY_RULES = Object.freeze({
  CRITICAL: {
    priority: 'P0',
    channels: ['console', 'structured_log', 'audit', 'webhook'],
    minIntervalMs: 0,
    grouping: 'consolidated',
    recipientProfiles: ['administrator', 'security', 'operations', 'directorate']
  },
  HIGH: {
    priority: 'P1',
    channels: ['console', 'structured_log', 'audit', 'webhook'],
    minIntervalMs: 300000,
    grouping: 'consolidated',
    recipientProfiles: ['administrator', 'security', 'operations']
  },
  MEDIUM: {
    priority: 'P2',
    channels: ['structured_log', 'audit'],
    minIntervalMs: 900000,
    grouping: 'consolidated',
    recipientProfiles: ['administrator', 'security']
  },
  LOW: {
    priority: 'P3',
    channels: ['structured_log', 'audit'],
    minIntervalMs: 3600000,
    grouping: 'digest',
    recipientProfiles: ['security']
  },
  INFORMATION: {
    priority: 'P4',
    channels: ['audit'],
    minIntervalMs: 86400000,
    grouping: 'digest',
    recipientProfiles: ['security']
  }
});

function resolveSeverityFromIncident(incident) {
  const sev = incident?.severity || 'LOW';
  if (sev === 'CRITICAL') return 'CRITICAL';
  if (sev === 'HIGH') return 'HIGH';
  if (sev === 'MEDIUM') return 'MEDIUM';
  if (sev === 'LOW') return 'LOW';
  return 'INFORMATION';
}

function resolveSeverityFromThreat(profile) {
  const risk = profile?.riskLevel || 'Low';
  if (risk === 'Critical') return 'CRITICAL';
  if (risk === 'High') return 'HIGH';
  if (risk === 'Medium') return 'MEDIUM';
  if (risk === 'Low') return 'LOW';
  return 'INFORMATION';
}

function resolveSeverityFromIntegrity(report) {
  const status = report?.integrityStatus || 'UNKNOWN';
  if (status === 'COMPROMISED') return 'CRITICAL';
  if (status === 'DEGRADED') return 'HIGH';
  if (status === 'INTEGRITY_OK') return 'INFORMATION';
  return 'MEDIUM';
}

function getRuleForSeverity(severity) {
  return SEVERITY_RULES[severity] || SEVERITY_RULES.INFORMATION;
}

function mapPriority(severity) {
  return getRuleForSeverity(severity).priority;
}

function mapChannels(severity) {
  return [...getRuleForSeverity(severity).channels];
}

function mapRecipientProfiles(severity) {
  return [...getRuleForSeverity(severity).recipientProfiles];
}

module.exports = {
  SEVERITY_RULES,
  resolveSeverityFromIncident,
  resolveSeverityFromThreat,
  resolveSeverityFromIntegrity,
  getRuleForSeverity,
  mapPriority,
  mapChannels,
  mapRecipientProfiles
};
