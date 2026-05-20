'use strict';

const SEVERITY_LEVELS = ['informational', 'low', 'medium', 'high', 'critical'];

const INCIDENT_TYPES = {
  governance_degradation: { base: 'medium' },
  leakage_incident: { base: 'critical' },
  overblocking_incident: { base: 'medium' },
  contextual_degradation: { base: 'medium' },
  drift_escalation: { base: 'high' },
  runtime_instability: { base: 'high' },
  activation_failure: { base: 'high' },
  rollback_event: { base: 'informational' }
};

function classifyIncident(type, signals = {}) {
  const def = INCIDENT_TYPES[type] || { base: 'low' };
  let severity = def.base;

  if (signals.leakage_detected || signals.leakage_risk === 'high') severity = 'critical';
  else if (signals.false_positive_rate > 0.15) severity = 'high';
  else if (signals.overblocking_rate > 0.2) severity = 'high';
  else if (signals.degradation_score > 0.35) severity = 'high';
  else if (signals.degradation_score > 0.15 && SEVERITY_LEVELS.indexOf(severity) < SEVERITY_LEVELS.indexOf('medium')) {
    severity = 'medium';
  }

  if (signals.escalate) {
    const idx = SEVERITY_LEVELS.indexOf(severity);
    if (idx < SEVERITY_LEVELS.length - 1) severity = SEVERITY_LEVELS[idx + 1];
  }

  return {
    type,
    severity,
    severity_levels: SEVERITY_LEVELS,
    classification_reason: signals.reason || 'rule_based',
    requires_manual_review: ['high', 'critical'].includes(severity),
    auto_response: false
  };
}

module.exports = { SEVERITY_LEVELS, INCIDENT_TYPES, classifyIncident };
