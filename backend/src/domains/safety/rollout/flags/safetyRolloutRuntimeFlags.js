'use strict';

function truthy(v) {
  return String(v || '').toLowerCase() === 'true' || v === '1';
}

function isSafetyRolloutRuntimeEnabled() {
  return truthy(process.env.IMPETUS_SAFETY_ROLLOUT_RUNTIME_ENABLED);
}

module.exports = { isSafetyRolloutRuntimeEnabled };
