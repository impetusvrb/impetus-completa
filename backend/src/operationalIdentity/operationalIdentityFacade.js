'use strict';

const flags = require('../phaseZ0/config/phaseZ0FeatureFlags');
const { resolveCanonicalOperationalIdentity } = require('./canonicalOperationalIdentityResolver');

function getOperationalIdentityStatus(ctx = {}) {
  return {
    phase: 'Z.0',
    layer: 'operational-identity',
    hardening: flags.isOperationalIdentityHardeningEnabled(),
    hierarchy_validation: flags.isHierarchyAuthorityValidationEnabled(),
    observability: flags.isRuntimeObservationObservabilityEnabled(),
    recommendation_only: true,
    auto_apply: false,
    tenant_id: ctx.tenant_id
  };
}

function resolveIdentityForUser(user, ctx = {}) {
  return resolveCanonicalOperationalIdentity(user, ctx);
}

function getOperationalIdentityReport(user, ctx = {}) {
  const resolved = resolveCanonicalOperationalIdentity(user, ctx);
  return {
    ok: true,
    status: getOperationalIdentityStatus(ctx),
    ...resolved,
    targeting: {
      governed_modules: resolved.authority_registry.governed_visible_modules,
      denied_modules: resolved.authority_registry.denied_modules,
      blocked: resolved.authority_registry.blocked_modules
    },
    auto_apply: false
  };
}

module.exports = {
  getOperationalIdentityStatus,
  resolveIdentityForUser,
  getOperationalIdentityReport,
  resolveCanonicalOperationalIdentity
};
