'use strict';

const TAGS = Object.freeze([
  'DOMAIN_INHERITANCE_APPLIED',
  'DOMAIN_SHARED_MODULE_ALLOWED',
  'DOMAIN_EXCLUSIVE_MODULE_BLOCKED',
  'SAFETY_ENVIRONMENTAL_CONFLICT',
  'TECHNICAL_RUNTIME_DENIED',
  'TECHNICAL_RUNTIME_ALLOWED',
  'TECHNICAL_RUNTIME_EXPOSED_ATTEMPT',
  'DOMAIN_CONTEXT_RESOLVED',
  'DOMAIN_RUNTIME_SCOPE'
]);

function logPhaseD(tag, payload) {
  if (!TAGS.includes(tag)) return;
  try {
    console.log(tag, JSON.stringify({ ts: new Date().toISOString(), ...payload }));
  } catch {
    /* never throw */
  }
}

module.exports = { TAGS, logPhaseD };
