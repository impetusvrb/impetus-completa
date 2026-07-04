'use strict';

/**
 * SEC-02 — Incident Store (in-memory, deduplicated evidence refs).
 */

const flags = require('../config/securityCorrelationFlags');
const { createSecurityIncidentDto } = require('../dto/securityIncidentDto');

/** @type {Map<string, object>} */
const incidents = new Map();

/** @type {Map<string, string>} correlationKey -> incidentId (open) */
const openIndex = new Map();

function correlationKeyForEvent(event) {
  const ip = event.source_ip || 'unknown';
  const cls = event.classification || 'UNKNOWN';
  return `ip:${ip}|cls:${cls}`;
}

function uaKey(ua) {
  if (!ua) return '';
  return String(ua).slice(0, 64).toLowerCase();
}

function findMatchingOpenIncident(event) {
  const ip = event.source_ip;
  const now = new Date(event.window_end || event.recorded_at || Date.now()).getTime();
  const windowMs = flags.correlationWindowMs();

  for (const inc of incidents.values()) {
    if (inc.status !== 'OPEN') continue;
    const last = new Date(inc.lastSeen).getTime();
    if (now - last > windowMs) continue;

    const ips = inc.participants.ips || [];
    if (ip && ips.includes(ip)) return inc;

    const ua = uaKey(event.user_agent);
    const incUas = (inc.participants.userAgents || []).map(uaKey);
    if (
      ua &&
      incUas.includes(ua) &&
      inc.classification === event.classification &&
      Math.abs(now - new Date(inc.firstSeen).getTime()) < windowMs
    ) {
      return inc;
    }
  }
  return null;
}

function mergeEventIntoIncident(incident, event) {
  const evTime = event.window_end || event.recorded_at || new Date().toISOString();
  const firstMs = new Date(incident.firstSeen).getTime();
  const lastMs = new Date(incident.lastSeen).getTime();
  const evMs = new Date(evTime).getTime();

  incident.lastSeen = evMs > lastMs ? evTime : incident.lastSeen;
  incident.firstSeen = evMs < firstMs ? (event.window_start || evTime) : incident.firstSeen;
  incident.durationMs = new Date(incident.lastSeen).getTime() - new Date(incident.firstSeen).getTime();
  incident.updatedAt = new Date().toISOString();

  const ip = event.source_ip;
  if (ip && !incident.participants.ips.includes(ip)) incident.participants.ips.push(ip);
  const ua = event.user_agent;
  if (ua && !incident.participants.userAgents.includes(ua)) {
    incident.participants.userAgents.push(String(ua).slice(0, 256));
  }

  const path = event.path_prefix;
  if (path) {
    const comp = inferComponent(path);
    if (comp && !incident.affectedComponents.includes(comp)) {
      incident.affectedComponents.push(comp);
    }
  }

  const evidenceRef = {
    eventId: event.id,
    event_type: event.event_type,
    classification: event.classification,
    window_start: event.window_start,
    window_end: event.window_end,
    request_count: event.request_count,
    path_prefix: event.path_prefix,
    source_ip: event.source_ip
  };

  const dup = incident.evidence.some((e) => e.eventId === event.id);
  if (!dup) incident.evidence.push(evidenceRef);

  incident.metrics.eventCount = incident.evidence.length;
  incident.metrics.requestCount += event.request_count || 0;

  const sc = event.status_codes || {};
  for (const [k, v] of Object.entries(sc)) {
    incident.metrics.statusCodes[k] = (incident.metrics.statusCodes[k] || 0) + v;
  }

  const paths = new Set(incident.evidence.map((e) => e.path_prefix).filter(Boolean));
  incident.metrics.uniquePaths = paths.size;
  incident.metrics.uniqueIps = incident.participants.ips.length;

  return incident;
}

function inferComponent(path) {
  if (!path) return 'http';
  if (path.startsWith('/api/auth')) return 'api-auth';
  if (path.startsWith('/api/')) return 'api-backend';
  if (path.startsWith('/assets/')) return 'frontend-assets';
  if (path.startsWith('/uploads/')) return 'uploads';
  if (path.startsWith('/socket.io')) return 'websocket';
  if (path === '/health') return 'health';
  return 'http-surface';
}

function createIncidentFromEvent(event) {
  const inc = createSecurityIncidentDto({
    firstSeen: event.window_start || event.recorded_at,
    lastSeen: event.window_end || event.recorded_at,
    classification: event.classification || 'UNKNOWN',
    participants: {
      ips: event.source_ip ? [event.source_ip] : [],
      userAgents: event.user_agent ? [String(event.user_agent).slice(0, 256)] : [],
      asns: event.source_asn ? [event.source_asn] : []
    },
    affectedComponents: event.path_prefix ? [inferComponent(event.path_prefix)] : ['http'],
    evidence: [],
    tags: [event.event_type].filter(Boolean),
    metrics: { eventCount: 0, requestCount: 0, uniquePaths: 0, uniqueIps: 0, statusCodes: {} }
  });
  mergeEventIntoIncident(inc, event);
  return inc;
}

function addIncident(incident) {
  if (incidents.size >= flags.maxOpenIncidents()) {
    closeStaleIncidents();
  }
  incidents.set(incident.incidentId, incident);
  if (incident.status === 'OPEN') {
    openIndex.set(correlationKeyForEvent({ source_ip: incident.participants.ips[0], classification: incident.classification }), incident.incidentId);
  }
  return incident;
}

function closeStaleIncidents() {
  const closureMs = flags.incidentClosureMs();
  const now = Date.now();
  for (const inc of incidents.values()) {
    if (inc.status !== 'OPEN') continue;
    const last = new Date(inc.lastSeen).getTime();
    if (now - last > closureMs) {
      inc.status = 'CLOSED';
      inc.updatedAt = new Date().toISOString();
      try {
        require('../metrics/correlationMetrics').recordIncidentClosed(inc.durationMs, inc.metrics.eventCount);
      } catch (_e) {}
    }
  }
}

function getIncident(id) {
  return incidents.get(id) || null;
}

function getOpenIncidents() {
  closeStaleIncidents();
  return [...incidents.values()].filter((i) => i.status === 'OPEN');
}

function getClosedIncidents(limit = 50) {
  return [...incidents.values()]
    .filter((i) => i.status === 'CLOSED')
    .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
    .slice(0, limit);
}

function getAllIncidents() {
  closeStaleIncidents();
  return [...incidents.values()].sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
}

function resetForTests() {
  incidents.clear();
  openIndex.clear();
}

module.exports = {
  correlationKeyForEvent,
  findMatchingOpenIncident,
  mergeEventIntoIncident,
  createIncidentFromEvent,
  addIncident,
  closeStaleIncidents,
  getIncident,
  getOpenIncidents,
  getClosedIncidents,
  getAllIncidents,
  resetForTests,
  inferComponent
};
