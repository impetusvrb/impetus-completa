'use strict';

const flags = require('./sz2FeatureFlags');

/**
 * Espelha invariantes da SZ2 num objecto reutilizável + helpers de
 * validação. Qualquer runtime cognitivo que tente flag de auto-execução
 * é bloqueado aqui antes de chegar a actions.
 */
const ALWAYS_FALSE_KEYS = Object.freeze([
  'auto_execution',
  'auto_enforcement',
  'auto_promotion',
  'plc_control',
  'industrial_autopilot',
  'auto_publish',
  'auto_approve',
  'auto_escalate'
]);

function enforceAssistiveOnly(actionDescriptor = {}) {
  const sanitized = { ...actionDescriptor };
  for (const key of ALWAYS_FALSE_KEYS) {
    sanitized[key] = false;
  }
  sanitized.assistive_only = true;
  sanitized.human_authority_required = true;
  return sanitized;
}

function isHumanAuthorityRequired() {
  return flags.invariants.human_authority_preserved === true;
}

module.exports = {
  ALWAYS_FALSE_KEYS,
  enforceAssistiveOnly,
  isHumanAuthorityRequired,
  invariants: flags.invariants
};
