'use strict';

/**
 * Feature flags — Fase E (Cognitive Governance Foundation).
 * Novas camadas default OFF; failsafe default ON.
 */

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isCognitivePolicyEngineEnabled: () => _flag('IMPETUS_COGNITIVE_POLICY_ENGINE', false),
  isCognitiveEnvelopeEnabled: () => _flag('IMPETUS_COGNITIVE_ENVELOPE', false),
  isContextSanitizerEnabled: () => _flag('IMPETUS_CONTEXT_SANITIZER', false),
  isFailsafeGovernanceEnabled: () => _flag('IMPETUS_FAILSAFE_GOVERNANCE', true)
};
