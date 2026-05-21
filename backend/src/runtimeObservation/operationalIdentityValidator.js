'use strict';

const flags = require('../phaseZ0/config/phaseZ0FeatureFlags');
const { logPhaseZ0 } = require('../phaseZ0/phaseZ0Logger');

function validateOperationalIdentity(ctx = {}) {
  const identity = ctx.canonical_identity || {};
  const missing = [];

  if (!identity.tenant_id && !ctx.tenant_id) missing.push('tenant');
  if (!identity.domain_axis && !identity.functional_axis) missing.push('functional_axis');
  if (!identity.profile_code && !ctx.profile_code) missing.push('profile');
  if (!identity.hierarchy_level && identity.hierarchy_level !== 0) missing.push('hierarchy_level');
  if (!identity.operational_scope) missing.push('operational_scope');

  const complete = missing.length === 0;
  const completeness_score = Number(Math.max(0.4, 1 - missing.length * 0.12).toFixed(4));

  if (!complete && flags.isRuntimeObservationObservabilityEnabled()) {
    logPhaseZ0('INCOMPLETE_OPERATIONAL_IDENTITY', {
      missing,
      tenant_id: ctx.tenant_id || identity.tenant_id,
      shadow_only: true
    });
  }

  return {
    identity_complete: complete,
    completeness_score,
    missing_fields: missing,
    identity,
    auto_apply: false
  };
}

module.exports = { validateOperationalIdentity };
