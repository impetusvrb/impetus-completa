'use strict';

function assertNoEscalation(ctx = {}) {
  const violations = [];
  if (ctx.auto_promotion === true) violations.push('auto_promotion_forbidden');
  if (ctx.governance_escalation === true) violations.push('governance_escalation_forbidden');
  if (ctx.authority_escalation === true) violations.push('authority_escalation_forbidden');
  if (ctx.target_stage === 'full' && !ctx.manual_full_approved) {
    violations.push('full_rollout_forbidden');
  }
  return {
    ok: violations.length === 0,
    blocked: violations.length > 0,
    violations,
    assistive_only: true
  };
}

module.exports = { assertNoEscalation };
