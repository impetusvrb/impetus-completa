'use strict';

/**
 * SEC-05 — Recipient profiles (severidade mínima configurável).
 */

const PROFILES = Object.freeze({
  administrator: {
    id: 'administrator',
    label: 'Administrador',
    minSeverity: 'MEDIUM',
    futureRecipients: ['wellington@impetus']
  },
  security: {
    id: 'security',
    label: 'Segurança',
    minSeverity: 'LOW',
    futureRecipients: ['gustavo@impetus', 'security-team@impetus']
  },
  operations: {
    id: 'operations',
    label: 'Operações',
    minSeverity: 'HIGH',
    futureRecipients: ['ops@impetus']
  },
  directorate: {
    id: 'directorate',
    label: 'Diretoria',
    minSeverity: 'CRITICAL',
    futureRecipients: ['diretoria@impetus']
  }
});

const SEVERITY_ORDER = ['INFORMATION', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function severityRank(severity) {
  const idx = SEVERITY_ORDER.indexOf(severity);
  return idx >= 0 ? idx : 0;
}

function resolveRecipientsForNotification(severity, profileIds) {
  const results = [];
  for (const pid of profileIds) {
    const profile = PROFILES[pid];
    if (!profile) continue;
    if (severityRank(severity) >= severityRank(profile.minSeverity)) {
      results.push({
        profileId: profile.id,
        label: profile.label,
        minSeverity: profile.minSeverity,
        delivery: 'audit_only',
        futureChannels: profile.futureRecipients
      });
    }
  }
  return results;
}

function suggestOwner(severity, classification) {
  if (severity === 'CRITICAL' || classification === 'CREDENTIAL_SCAN') return 'security';
  if (classification === 'OPERATIONAL_ACCESS') return 'operations';
  if (severity === 'HIGH') return 'administrator';
  return 'security';
}

module.exports = {
  PROFILES,
  resolveRecipientsForNotification,
  suggestOwner,
  severityRank
};
