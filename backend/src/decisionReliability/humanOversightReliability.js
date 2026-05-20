'use strict';

const phaseR = require('./config/phaseRFeatureFlags');
const { computeSupervisedDecisionConfidence } = require('./supervisedDecisionConfidence');
const { assessEscalationReliability } = require('./governanceEscalationReliability');

function assessHumanOversight(signals = {}) {
  const supervised = computeSupervisedDecisionConfidence(signals);
  const escalation = assessEscalationReliability(supervised);
  return {
    ...supervised,
    escalation,
    enforcement_active: phaseR.isHumanOversightReliabilityEnabled(),
    shadow_only: !phaseR.isHumanOversightReliabilityEnabled(),
    auto_block: false,
    auto_escalate: false
  };
}

module.exports = { assessHumanOversight };
