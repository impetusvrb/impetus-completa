'use strict';

const { invariants } = require('../config/sz2GovernanceFlags');

function assertHumanAuthority() {
  return {
    human_authority_preserved: invariants.human_authority_preserved === true,
    auto_execution_blocked: invariants.auto_execution === false,
    auto_promotion_blocked: invariants.auto_promotion === false,
    auto_enforcement_blocked: invariants.auto_enforcement === false
  };
}

module.exports = { assertHumanAuthority };
