'use strict';

const { assertHumanAuthority } = require('./zHumanAuthorityRuntime');
const { detectAutonomyAttempts } = require('./zAutonomyProtectionRuntime');
const { sanitizeActions } = require('./zAssistiveOnlyProtectionRuntime');
const { invariants } = require('../config/sz2GovernanceFlags');

function evaluateGovernance({ actions = {}, stage = 'Z_COGNITIVE_SHADOW' } = {}) {
  const sanitized = sanitizeActions(actions?.actions || []);
  const autonomy = detectAutonomyAttempts({});
  const auth = assertHumanAuthority();
  return {
    stage,
    invariants,
    human_authority: auth,
    autonomy_protection: autonomy,
    sanitized_action_count: sanitized.length,
    governance_score: Number(
      ((auth.human_authority_preserved ? 0.5 : 0) +
        (autonomy.invariants_preserved ? 0.5 : 0)).toFixed(3)
    )
  };
}

module.exports = { evaluateGovernance };
