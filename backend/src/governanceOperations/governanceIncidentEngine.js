'use strict';

const phaseJ = require('./config/phaseJFeatureFlags');
const { logPhaseJ } = require('./phaseJLogger');
const { classifyIncident } = require('./governanceIncidentClassifier');
const { appendToTimeline, listTimeline } = require('./governanceIncidentTimeline');

const _openIncidents = new Map();

function detectIncident(type, signals = {}) {
  if (!phaseJ.isGovernanceIncidentEngineEnabled() && !signals.force) {
    return { detected: false, reason: 'incident_engine_off' };
  }

  const classification = classifyIncident(type, signals);
  const incident = {
    type,
    ...classification,
    signals,
    tenant_id: signals.tenant_id || null,
    channel: signals.channel || null,
    status: 'open',
    auto_remediation: false
  };

  const entry = appendToTimeline(incident);
  _openIncidents.set(entry.id, entry);

  logPhaseJ('GOVERNANCE_INCIDENT_DETECTED', {
    incident_id: entry.id,
    type,
    severity: classification.severity
  });

  if (classification.severity === 'critical') {
    logPhaseJ('GOVERNANCE_RUNTIME_CRITICAL', { incident_id: entry.id, type });
  }
  if (type === 'contextual_degradation') {
    logPhaseJ('GOVERNANCE_CONTEXTUAL_DEGRADATION', { incident_id: entry.id, ...signals });
  }

  try {
    const audit = require('../audit/cognitiveGovernanceAuditFeed');
    audit.appendOperational({ type: 'incident', incident_id: entry.id, ...incident });
  } catch {
    /* optional */
  }

  return { detected: true, incident: entry };
}

function escalateIncident(incidentId, reason = '') {
  const inc = _openIncidents.get(incidentId);
  if (!inc) return { escalated: false, reason: 'not_found' };

  const reclassified = classifyIncident(inc.type, { ...inc.signals, escalate: true, reason });
  Object.assign(inc, reclassified, { escalated_at: new Date().toISOString() });

  logPhaseJ('GOVERNANCE_INCIDENT_ESCALATED', { incident_id: incidentId, severity: inc.severity });

  return { escalated: true, incident: inc, auto_executed: false };
}

function listIncidents(opts = {}) {
  return {
    enabled: phaseJ.isGovernanceIncidentEngineEnabled(),
    incidents: listTimeline(opts),
    open_count: _openIncidents.size
  };
}

function clearForTests() {
  _openIncidents.clear();
  require('./governanceIncidentTimeline').clearForTests();
}

module.exports = { detectIncident, escalateIncident, listIncidents, clearForTests };
