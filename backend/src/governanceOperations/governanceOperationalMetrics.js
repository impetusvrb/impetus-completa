'use strict';

const phaseJ = require('./config/phaseJFeatureFlags');

function computeOperationalMetrics(ctx = {}) {
  let readiness = {};
  let health = {};
  let incidents = { incidents: [] };

  try {
    readiness = require('../governanceReadiness/governanceReadinessEngine').assessReadiness({ force: true });
  } catch {
    readiness = {};
  }

  try {
    const { getHealthIfMonitoring } = require('../governanceActivation/governanceRuntimeHealth');
    health = getHealthIfMonitoring();
  } catch {
    health = {};
  }

  if (phaseJ.isGovernanceIncidentEngineEnabled() || ctx.force) {
    try {
      incidents = require('./governanceIncidentEngine').listIncidents({ limit: 50 });
    } catch {
      incidents = { incidents: [] };
    }
  }

  const incidentList = incidents.incidents || [];
  const criticalCount = incidentList.filter((i) => i.severity === 'critical').length;
  const highCount = incidentList.filter((i) => i.severity === 'high').length;

  const governance_operational_health = _scoreHealth(readiness, health, criticalCount, highCount);
  const governance_runtime_stability = health.activation_stability_score ?? readiness.shadow_alignment_rate ?? 0.9;
  const governance_activation_safety = readiness.activation_safety_score ?? 0;
  const governance_incident_rate = incidentList.length / Math.max(50, 1);
  const governance_drift_pressure = readiness.drift_stability === 'unstable' ? 0.8 : readiness.drift_stability === 'watch' ? 0.4 : 0.1;
  const governance_context_integrity = readiness.governance_context_preservation_rate ?? 0.9;

  return {
    governance_operational_health,
    governance_runtime_stability,
    governance_activation_safety,
    governance_incident_rate,
    governance_drift_pressure,
    governance_context_integrity,
    readiness_score: readiness.readiness_score,
    computed_at: new Date().toISOString()
  };
}

function _scoreHealth(readiness, health, critical, high) {
  let score = (readiness.readiness_score || 70) / 100;
  if (health.activation_stability_score != null) {
    score = (score + health.activation_stability_score) / 2;
  }
  score -= critical * 0.15;
  score -= high * 0.05;
  return Number(Math.max(0, Math.min(1, score)).toFixed(4));
}

module.exports = { computeOperationalMetrics };
