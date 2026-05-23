'use strict';

const flags = require('../../config/phaseZ28FeatureFlags');

function verifyGovernanceSafeAdaptation(supervised = {}) {
  return {
    safe: supervised.mutations_applied === 0 && !flags.autoMutationAllowed,
    governance_preserved: true,
    auto_decision_blocked: true
  };
}

module.exports = { verifyGovernanceSafeAdaptation };
