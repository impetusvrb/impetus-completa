'use strict';

function buildEnvironmentalGovernanceHealth(liveValidation = {}) {
  const lv = liveValidation.environmental_live_validation || liveValidation;
  const score =
    (lv.regulatory_integrity ? 0.2 : 0) +
    (lv.compliance_governance_valid ? 0.2 : 0) +
    (lv.esg_contextual_valid ? 0.2 : 0) +
    (lv.cross_domain_clean ? 0.15 : 0) +
    (lv.runtime_performance_safe ? 0.15 : 0) +
    (!lv.alert_fatigue_detected ? 0.1 : 0);
  return { environmental_governance_health: { score: Math.round(score * 100) / 100, healthy: score >= 0.75 } };
}

module.exports = { buildEnvironmentalGovernanceHealth };
