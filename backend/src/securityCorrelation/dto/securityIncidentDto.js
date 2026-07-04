'use strict';

/**
 * SEC-02 — Security Incident DTO.
 * Eventos originais nunca são alterados — apenas referenciados em evidence.
 */

const SEVERITIES = Object.freeze(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const STATUSES = Object.freeze(['OPEN', 'CLOSED', 'MERGED']);

let incidentSeq = 0;

function nextIncidentId() {
  incidentSeq += 1;
  return `inc-${Date.now()}-${incidentSeq.toString(36)}`;
}

/**
 * @param {object} input
 * @returns {object}
 */
function createSecurityIncidentDto(input) {
  const now = new Date().toISOString();
  return {
    schema_version: 'security_incident_v1',
    incidentId: input.incidentId || nextIncidentId(),
    firstSeen: input.firstSeen || now,
    lastSeen: input.lastSeen || now,
    durationMs: Number(input.durationMs) || 0,
    severity: SEVERITIES.includes(input.severity) ? input.severity : 'INFO',
    confidence: Math.min(1, Math.max(0, Number(input.confidence) || 0)),
    classification: input.classification || 'UNKNOWN',
    timeline: Array.isArray(input.timeline) ? [...input.timeline] : [],
    participants: input.participants || { ips: [], userAgents: [], asns: [] },
    affectedComponents: Array.isArray(input.affectedComponents) ? [...input.affectedComponents] : [],
    evidence: Array.isArray(input.evidence) ? [...input.evidence] : [],
    status: STATUSES.includes(input.status) ? input.status : 'OPEN',
    tags: Array.isArray(input.tags) ? [...input.tags] : [],
    riskScore: Math.min(1, Math.max(0, Number(input.riskScore) || 0)),
    summary: input.summary || null,
    metrics: input.metrics || {
      eventCount: 0,
      requestCount: 0,
      uniquePaths: 0,
      uniqueIps: 0,
      statusCodes: {}
    },
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now
  };
}

function freezeIncident(incident) {
  return Object.freeze(JSON.parse(JSON.stringify(incident)));
}

module.exports = {
  SEVERITIES,
  STATUSES,
  createSecurityIncidentDto,
  freezeIncident,
  nextIncidentId
};
