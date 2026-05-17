'use strict';

function truthy(v) {
  return String(v || '').toLowerCase() === 'true' || v === '1';
}

function isSafetyCognitiveRuntimeEnabled() {
  return truthy(process.env.IMPETUS_SAFETY_COGNITIVE_RUNTIME_ENABLED);
}

module.exports = { isSafetyCognitiveRuntimeEnabled };
