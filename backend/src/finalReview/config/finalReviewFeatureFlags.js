'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isFinalGovernanceReviewEnabled: () => _flag('IMPETUS_FINAL_GOVERNANCE_REVIEW', false),
  isRuntimeValidationEnabled: () => _flag('IMPETUS_RUNTIME_VALIDATION', false),
  isRolloutSafetyValidationEnabled: () => _flag('IMPETUS_ROLLOUT_SAFETY_VALIDATION', false)
};
