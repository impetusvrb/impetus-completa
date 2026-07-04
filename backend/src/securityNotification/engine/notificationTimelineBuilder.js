'use strict';

/**
 * SEC-05 — Notification Timeline builder.
 */

const PHASE_LABELS = {
  RECONNAISSANCE: 'Reconhecimento',
  ENUMERATION: 'Enumeração',
  RESOURCE_DISCOVERY: 'Descoberta de recursos',
  AUTH_ATTEMPT: 'Tentativa de autenticação',
  PERSISTENCE: 'Persistência',
  INTEGRITY_COMPROMISED: 'Integridade comprometida',
  INTEGRITY_DEGRADED: 'Integridade degradada',
  THREAT_ASSESSED: 'Ameaça avaliada',
  CLOSURE: 'Encerramento'
};

/**
 * @param {object} incident
 * @param {object|null} threatProfile
 * @param {object|null} integrityReport
 */
function buildNotificationTimeline(incident, threatProfile, integrityReport) {
  const timeline = [];

  if (incident?.timeline?.length) {
    for (const phase of incident.timeline) {
      timeline.push({
        timestamp: phase.timestamp,
        phase: phase.phase,
        label: phase.label || PHASE_LABELS[phase.phase] || phase.phase,
        source: 'SEC-02'
      });
    }
  }

  if (threatProfile) {
    timeline.push({
      timestamp: threatProfile.analyzedAt,
      phase: 'THREAT_ASSESSED',
      label: PHASE_LABELS.THREAT_ASSESSED,
      detail: threatProfile.primaryAssessment,
      source: 'SEC-03'
    });
  }

  if (integrityReport) {
    const phase =
      integrityReport.integrityStatus === 'COMPROMISED'
        ? 'INTEGRITY_COMPROMISED'
        : integrityReport.integrityStatus === 'DEGRADED'
          ? 'INTEGRITY_DEGRADED'
          : null;
    if (phase) {
      timeline.push({
        timestamp: integrityReport.checkedAt,
        phase,
        label: PHASE_LABELS[phase],
        detail: `Score: ${integrityReport.integrityScore}`,
        source: 'SEC-04'
      });
    }
  }

  return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

module.exports = { buildNotificationTimeline, PHASE_LABELS };
