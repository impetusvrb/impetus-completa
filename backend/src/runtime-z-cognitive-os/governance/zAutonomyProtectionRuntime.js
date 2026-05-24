'use strict';

const { ALWAYS_FALSE_KEYS, invariants } = require('../config/sz2GovernanceFlags');

function detectAutonomyAttempts(descriptor = {}) {
  const flags = [];
  for (const key of ALWAYS_FALSE_KEYS) if (descriptor[key]) flags.push(key);
  return {
    autonomy_attempts: flags,
    blocked: flags.length > 0,
    invariants_preserved: flags.length === 0,
    plc_control_blocked: invariants.plc_control === false
  };
}

module.exports = { detectAutonomyAttempts };
