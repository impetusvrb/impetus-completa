'use strict';

const flags = require('../../config/phaseZ29FeatureFlags');

function verifyGovernanceLearningSafety(report = {}) {
  return {
    safe: report.auto_mutation_applied !== true && !flags.autoMutationAllowed,
    auto_decision_blocked: true,
    rollback_safe: true
  };
}

module.exports = { verifyGovernanceLearningSafety };
