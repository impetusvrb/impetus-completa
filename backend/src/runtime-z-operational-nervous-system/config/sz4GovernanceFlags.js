'use strict';

const flags = require('./sz4FeatureFlags');

const ALWAYS_FALSE_KEYS = Object.freeze([
  'auto_execution',
  'auto_escalation',
  'auto_send',
  'auto_promotion',
  'biometric_enforcement',
  'plc_control',
  'irreversible_escalation'
]);

function enforceAssistiveOnly(payload = {}) {
  const out = { ...payload };
  for (const k of ALWAYS_FALSE_KEYS) {
    if (k in out) out[k] = false;
  }
  out.assistive_only = true;
  out.approval_required = true;
  out.human_authority_preserved = true;
  return out;
}

function sanitizeExecutionPlan(plan = {}) {
  return enforceAssistiveOnly({
    ...plan,
    prepared_only: true,
    requires_human_validation: true,
    auto_execution: false
  });
}

module.exports = {
  ALWAYS_FALSE_KEYS,
  invariants: flags.invariants,
  enforceAssistiveOnly,
  sanitizeExecutionPlan,
  assertNoAutonomousExecution: (plan = {}) => {
    for (const k of ALWAYS_FALSE_KEYS) {
      if (plan[k] === true) {
        return { ok: false, reason: `forbidden:${k}` };
      }
    }
    return { ok: true };
  }
};
