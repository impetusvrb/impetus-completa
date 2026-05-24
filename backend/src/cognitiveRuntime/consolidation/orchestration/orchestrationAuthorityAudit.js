'use strict';

function auditOrchestrationAuthority(payload = {}) {
  const adaptive = payload.adaptive_orchestration;
  const learning = payload.governance_learning;

  return {
    adaptive_present: !!adaptive,
    adaptive_governs_delivery: false,
    adaptive_recommends_only: adaptive?.adaptation_recommended != null && adaptive?.auto_mutation_applied === false,
    learning_present: !!learning,
    learning_governs_delivery: false,
    learning_supervised: learning?.auto_mutation_applied === false,
    orchestration_authority: 'supervised_recommendation_only'
  };
}

module.exports = { auditOrchestrationAuthority };
