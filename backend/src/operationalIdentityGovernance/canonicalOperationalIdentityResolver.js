'use strict';

const flags = require('./config/phaseZ13FeatureFlags');
const { logPhaseZ13 } = require('./phaseZ13Logger');
const { mapHierarchyAuthority } = require('./hierarchyAuthorityMapper');
const { resolveDomainResponsibility } = require('./domainResponsibilityResolver');
const { normalizeOrganizationalRole } = require('./organizationalRoleNormalizer');

function resolveGovernedCanonicalIdentity(user = {}, ctx = {}) {
  let base = { canonical_identity: {}, domain: {}, hierarchy: {}, role_scope: {} };
  try {
    base = require('../operationalIdentity/canonicalOperationalIdentityResolver').resolveCanonicalOperationalIdentity(
      user,
      ctx
    );
  } catch (e) {
    base = { canonical_identity: { tenant_id: user.company_id }, domain: {}, hierarchy: {} };
    if (flags.isOperationalLeakageObservabilityEnabled()) {
      logPhaseZ13('IDENTITY_BASE_RESOLVE_FALLBACK', { error: e.message });
    }
  }

  const domain = resolveDomainResponsibility(user, ctx, base.domain || {});
  const hierarchy = mapHierarchyAuthority(user, ctx, base.hierarchy || {});
  const roleNorm = normalizeOrganizationalRole(user, ctx);

  const canonical_identity = {
    ...base.canonical_identity,
    domain_axis: domain.domain_axis || base.canonical_identity?.domain_axis,
    functional_axis: domain.functional_axis || base.canonical_identity?.functional_axis,
    hierarchy_level: hierarchy.hierarchy_level ?? base.canonical_identity?.hierarchy_level,
    hierarchy_tier: hierarchy.hierarchy_tier || base.canonical_identity?.hierarchy_tier,
    functional_role: roleNorm.functional_role || domain.functional_role,
    governance_layer: 'Z.13',
    identity_governance_applied: domain.governance_applied || hierarchy.governance_applied,
    recommendation_only: !flags.isRealEnforcementActivationEnabled(),
    enforcement_ready: !!(domain.domain_axis && domain.domain_axis !== 'unknown')
  };

  if (!canonical_identity.enforcement_ready && flags.isOperationalLeakageObservabilityEnabled()) {
    logPhaseZ13('GOVERNED_IDENTITY_INCOMPLETE', {
      tenant_id: canonical_identity.tenant_id,
      job_title: user.job_title || user.cargo
    });
  }

  return {
    canonical_identity,
    domain,
    hierarchy,
    role_scope: base.role_scope,
    authority_registry: base.authority_registry,
    domain_authority: base.domain_authority,
    role_normalization: roleNorm,
    auto_apply: false,
    auto_remediate: false
  };
}

module.exports = { resolveGovernedCanonicalIdentity };
