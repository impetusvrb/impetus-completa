'use strict';

const { resolveFunctionalDomain } = require('./functionalDomainResolver');
const { resolveHierarchyAuthority } = require('./hierarchyAuthorityResolver');
const { resolveRoleScope } = require('./roleScopeResolver');
const { buildContextualAuthorityRegistry } = require('./contextualAuthorityRegistry');
const flags = require('../phaseZ0/config/phaseZ0FeatureFlags');
const { logPhaseZ0 } = require('../phaseZ0/phaseZ0Logger');

function resolveCanonicalOperationalIdentity(user = {}, ctx = {}) {
  const tenant_id = user.company_id || ctx.tenant_id;
  const profile_code = ctx.profile_code || user.profile_code;
  const domain = resolveFunctionalDomain(user, ctx);
  const hierarchy = resolveHierarchyAuthority(user, { ...ctx, profile_code });

  let domainAuthority = {};
  try {
    const resolver = require('../domainAuthority/resolvers/domainAuthorityResolver');
    domainAuthority = resolver.resolveDomainAuthority(user, {
      profile_code,
      profile_config: { visible_modules: ctx.visible_modules || user.visible_modules || [] }
    });
  } catch {
    domainAuthority = {};
  }

  const role_scope = resolveRoleScope(
    { ...user, visible_modules: ctx.visible_modules },
    hierarchy,
    domain
  );

  const registry = buildContextualAuthorityRegistry(
    { tenant_id, ...domain, profile_code, hierarchy_level: hierarchy.hierarchy_level },
    domainAuthority
  );

  const identity = {
    tenant_id,
    company_id: tenant_id,
    profile_code,
    functional_axis: domain.functional_axis,
    domain_axis: domain.domain_axis,
    department: user.department || ctx.department,
    job_title: user.job_title || user.cargo || ctx.job_title,
    role: hierarchy.role,
    hierarchy_level: hierarchy.hierarchy_level,
    hierarchy_tier: hierarchy.hierarchy_tier,
    operational_scope: role_scope.scope,
    expected_modules: registry.governed_visible_modules.length
      ? registry.governed_visible_modules
      : registry.allowed_modules?.slice(0, 12) || [],
    inference_complete: !!(domain.domain_axis && domain.domain_axis !== 'unknown' && profile_code),
    recommendation_only: true,
    enforcement_active: flags.isOperationalIdentityHardeningEnabled()
  };

  if (!identity.inference_complete && flags.isRuntimeObservationObservabilityEnabled()) {
    logPhaseZ0('CANONICAL_IDENTITY_INCOMPLETE', { tenant_id, profile_code, shadow_only: true });
  }

  return {
    canonical_identity: identity,
    domain,
    hierarchy,
    role_scope,
    authority_registry: registry,
    domain_authority: domainAuthority,
    auto_apply: false
  };
}

module.exports = { resolveCanonicalOperationalIdentity };
