'use strict';

const flags = require('./config/phaseZ13FeatureFlags');
const { resolveGovernedCanonicalIdentity } = require('./canonicalOperationalIdentityResolver');
const { validateFunctionalIdentity } = require('./functionalIdentityValidator');
const { normalizeOrganizationalRole } = require('./organizationalRoleNormalizer');

function getOperationalIdentityGovernanceStatus(ctx = {}) {
  return {
    phase: 'Z.13',
    layer: 'operational-identity-governance',
    governance_enabled: flags.isOperationalIdentityGovernanceEnabled(),
    real_enforcement_flags: flags.isRealEnforcementActivationEnabled(),
    chat_enforcement: flags.chatEnforcement,
    boundary_governance: flags.boundaryGovernance,
    auto_remediate: flags.autoRemediation,
    tenant_id: ctx.tenant_id
  };
}

function resolveGovernedIdentityForUser(user = {}, ctx = {}) {
  if (!flags.isOperationalIdentityGovernanceEnabled() && !ctx.force) {
    try {
      return require('../operationalIdentity/operationalIdentityFacade').resolveIdentityForUser(user, ctx);
    } catch {
      return { canonical_identity: { tenant_id: user.company_id } };
    }
  }
  return resolveGovernedCanonicalIdentity(user, ctx);
}

function assessIdentityReadiness(user = {}, ctx = {}) {
  const pack = resolveGovernedIdentityForUser(user, ctx);
  const modules = ctx.visible_modules || user.visible_modules || [];
  const validation = validateFunctionalIdentity(pack.canonical_identity, modules);
  return {
    ok: true,
    identity: pack,
    validation,
    role_normalization: normalizeOrganizationalRole(user, ctx),
    enforcement_ready: pack.canonical_identity?.enforcement_ready === true,
    recommendation_only: true
  };
}

function getOperationalIdentityGovernanceReport(user = {}, ctx = {}) {
  return {
    ok: true,
    status: getOperationalIdentityGovernanceStatus({ tenant_id: user?.company_id || ctx.tenant_id }),
    ...assessIdentityReadiness(user, ctx)
  };
}

module.exports = {
  getOperationalIdentityGovernanceStatus,
  resolveGovernedIdentityForUser,
  assessIdentityReadiness,
  getOperationalIdentityGovernanceReport
};
