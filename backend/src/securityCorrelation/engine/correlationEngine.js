'use strict';

/**
 * SEC-02 — Enterprise Security Correlation Engine (determinístico).
 * Agrupa eventos SEC-01 em incidentes únicos — read-only, sem alterar eventos originais.
 */

const flags = require('../config/securityCorrelationFlags');
const store = require('../store/incidentStore');
const metrics = require('../metrics/correlationMetrics');
const { computeSeverity } = require('../engine/severityCalculator');
const { computeRiskScore } = require('../engine/riskScoreCalculator');
const {
  buildIncidentSummary,
  buildIncidentTimelinePhases
} = require('../engine/incidentSummaryBuilder');
const { freezeIncident } = require('../dto/securityIncidentDto');

function finalizeIncident(incident) {
  const ctx = {
    classification: incident.classification,
    requestCount: incident.metrics.requestCount,
    eventCount: incident.metrics.eventCount,
    uniquePaths: incident.metrics.uniquePaths,
    uniqueIps: incident.metrics.uniqueIps,
    statusCodes: incident.metrics.statusCodes,
    durationMs: incident.durationMs
  };

  incident.severity = computeSeverity(ctx);
  incident.riskScore = computeRiskScore({ ...ctx, severity: incident.severity });
  incident.confidence = computeConfidence(incident);

  const phaseEvents = incident.evidence
    .map((e) => ({
      time: e.window_end || e.window_start,
      event_type: e.event_type,
      path: e.path_prefix
    }))
    .sort((a, b) => new Date(a.time) - new Date(b.time));

  incident.timeline = buildIncidentTimelinePhases(phaseEvents);
  incident.summary = buildIncidentSummary(incident);

  if (!incident.tags.includes('correlated')) incident.tags.push('correlated');
  incident.updatedAt = new Date().toISOString();

  return incident;
}

function computeConfidence(incident) {
  let c = 0.5;
  if (incident.metrics.eventCount >= 5) c += 0.15;
  if (incident.metrics.requestCount >= 100) c += 0.15;
  if (incident.participants.ips.length === 1) c += 0.1;
  if (incident.classification !== 'UNKNOWN') c += 0.1;
  return Math.min(1, Math.round(c * 100) / 100);
}

/**
 * Correlaciona um evento SEC-01 → incidente (merge ou create).
 * @param {object} event — Security Event DTO (read-only)
 * @returns {object|null}
 */
function correlateEvent(event) {
  if (!flags.isSecurityCorrelationEngineEnabled()) return null;
  if (!event || !event.id) return null;

  metrics.increment('correlation_runs');

  try {
    let incident = store.findMatchingOpenIncident(event);

    if (incident) {
      store.mergeEventIntoIncident(incident, event);
      metrics.increment('incident_groups');
    } else {
      incident = store.createIncidentFromEvent(event);
      store.addIncident(incident);
      metrics.increment('security_incidents');
    }

    finalizeIncident(incident);
    return freezeIncident(incident);
  } catch (e) {
    metrics.increment('correlation_errors');
    throw e;
  }
}

/**
 * Correlaciona batch (ex.: import nginx 23k lines → N buckets → M incidents).
 * @param {object[]} events
 * @returns {object[]}
 */
function correlateBatch(events) {
  if (!Array.isArray(events)) return [];
  const results = [];
  for (const ev of events) {
    const inc = correlateEvent(ev);
    if (inc) results.push(inc);
  }
  return dedupeIncidents(results);
}

function dedupeIncidents(list) {
  const map = new Map();
  for (const item of list) {
    map.set(item.incidentId, item);
  }
  return [...map.values()];
}

/**
 * Re-processa eventos recentes do SEC-01 bus (backfill).
 */
function correlateRecentFromObservatory(limit = 100) {
  try {
    const bus = require('../../securityObservatory/bus/securityEventBus');
    const events = bus.getRecentEvents(limit);
    return correlateBatch(events);
  } catch (_e) {
    return [];
  }
}

module.exports = {
  correlateEvent,
  correlateBatch,
  correlateRecentFromObservatory,
  finalizeIncident,
  computeConfidence
};
