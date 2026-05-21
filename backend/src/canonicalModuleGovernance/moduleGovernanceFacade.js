'use strict';

const flags = require('./config/phaseZ14FeatureFlags');
const { resolveSidebarGovernance } = require('./sidebarGovernanceResolver');
const { resolveModuleLeakage } = require('./moduleLeakageResolver');

function getModuleGovernanceStatus(ctx = {}) {
  return {
    phase: 'Z.14',
    layer: 'canonical-module-governance',
    canonical_governance: flags.isCanonicalModuleGovernanceEnabled(),
    sidebar_runtime: flags.isSidebarGovernanceRuntimeEnabled(),
    legacy_protection: flags.isLegacyModuleProtectionEnabled(),
    contextual_hardening: flags.isContextualModuleHardeningEnabled(),
    observability: flags.isSidebarObservabilityEnabled(),
    tenant_id: ctx.tenant_id,
    recommendation_first: !flags.isSidebarGovernanceRuntimeEnabled()
  };
}

function applySidebarGovernanceToDashboard(user = {}, legacyResponse = {}, ctx = {}) {
  let identity = { canonical_identity: {} };
  try {
    identity = require('../operationalIdentityGovernance/operationalIdentityGovernanceFacade').resolveGovernedIdentityForUser(
      user,
      {
        visible_modules: legacyResponse.visible_modules,
        profile_code: legacyResponse.profile_code
      }
    );
  } catch {
    try {
      identity = require('../operationalIdentity/operationalIdentityFacade').resolveIdentityForUser(user, ctx);
    } catch {
      identity = { canonical_identity: { tenant_id: user?.company_id } };
    }
  }

  const ci = identity.canonical_identity || {};
  let realActive = false;
  try {
    const { isRealEnforcementActiveForTenant } = require('../realTenantEnforcement/realTenantEnforcementSupervisor');
    realActive = isRealEnforcementActiveForTenant(user?.company_id, ctx);
  } catch {
    /* optional */
  }

  const resolved = resolveSidebarGovernance(
    {
      visible_modules: legacyResponse.visible_modules || [],
      contextual_modules: ctx.contextual_modules || [],
      legacy_modules: ctx.legacy_visible_modules || legacyResponse.visible_modules || [],
      profile: { code: legacyResponse.profile_code },
      hierarchy: { tier: ci.hierarchy_tier, level: ci.hierarchy_level },
      authority: { scope: ci.authority_scope || ci.operational_scope },
      domain: { axis: ci.domain_axis },
      tenant: { id: user?.company_id }
    },
    {
      ...ctx,
      canonical_identity: ci,
      real_enforcement_active: realActive,
      force_sidebar_governance: ctx.force_sidebar_governance
    }
  );

  const response = { ...legacyResponse };
  if (resolved.governance_applied) {
    response.visible_modules = resolved.final_visible_modules;
  }

  const sidebar_governance_runtime = {
    governance_applied: resolved.governance_applied,
    leakage_detected: resolved.leakage_detected,
    removed_modules: (resolved.removed_modules || []).map((r) => r.module || r),
    preserved_modules: resolved.preserved_modules,
    final_visible_modules: resolved.final_visible_modules,
    governance_score: resolved.governance_score,
    authority_level: resolved.authority_level || '',
    domain: resolved.domain || '',
    hierarchy: resolved.hierarchy || '',
    fallback_applied: resolved.fallback_applied,
    recommendation_only: resolved.recommendation_only,
    denied_publications: resolved.reinjection?.denied_publications || [],
    contextual_modules_filtered: flags.isContextualModuleHardeningEnabled() || resolved.governance_applied
  };

  return {
    response,
    sidebar_governance_runtime,
    contextual_modules_after: resolved.final_contextual_modules,
    governance_resolution: resolved,
    distribution: resolveModuleLeakage(resolved.final_visible_modules, {
      domain_axis: ci.domain_axis,
      hierarchy_tier: ci.hierarchy_tier,
      canonical_identity: ci
    })
  };
}

function getSidebarGovernanceReport(user = {}, ctx = {}) {
  return { ok: true, ...applySidebarGovernanceToDashboard(user, ctx.legacy || {}, ctx) };
}

module.exports = {
  getModuleGovernanceStatus,
  applySidebarGovernanceToDashboard,
  getSidebarGovernanceReport
};
