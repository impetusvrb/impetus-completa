'use strict';

const flags = require('../phaseZ0/config/phaseZ0FeatureFlags');
const { logPhaseZ0 } = require('../phaseZ0/phaseZ0Logger');

function observeAuthorityConflicts(ctx = {}) {
  const conflicts = [];
  const identity = ctx.canonical_identity || {};
  const authority = ctx.domain_authority || {};

  if (identity.domain_axis && authority.domain_axis && identity.domain_axis !== authority.domain_axis) {
    conflicts.push({
      type: 'axis_conflict',
      canonical: identity.domain_axis,
      authority: authority.domain_axis
    });
  }

  const blocked = authority.blocked_modules || [];
  const visible = ctx.visible_modules || [];
  for (const mod of visible) {
    if (blocked.some((b) => b.module === mod || b === mod)) {
      conflicts.push({ type: 'blocked_module_still_visible', module: mod });
    }
  }

  if (ctx.role_scope?.conflicts?.length) {
    conflicts.push(...ctx.role_scope.conflicts.map((c) => ({ type: 'role_scope', ...c })));
  }

  if (conflicts.length && flags.isRuntimeObservationObservabilityEnabled()) {
    logPhaseZ0('AUTHORITY_CONFLICT_DETECTED', { count: conflicts.length, tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return { conflict_detected: conflicts.length > 0, conflicts, auto_apply: false };
}

module.exports = { observeAuthorityConflicts };
