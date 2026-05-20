'use strict';

function assessEscalationReliability(signals = {}) {
  return {
    escalation_recommended: signals.escalate_recommended === true,
    reason: signals.escalate_recommended ? 'low_operational_trust_or_high_ambiguity' : null,
    auto_escalate: false
  };
}

module.exports = { assessEscalationReliability };
