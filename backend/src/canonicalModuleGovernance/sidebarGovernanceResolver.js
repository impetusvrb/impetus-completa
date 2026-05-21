'use strict';

const flags = require('./config/phaseZ14FeatureFlags');
const { logPhaseZ14 } = require('./phaseZ14Logger');
const { applySafeSidebarPruning } = require('./safeSidebarPruningRuntime');
const { resolveModuleLeakage } = require('./moduleLeakageResolver');
const {
  preventLegacyModuleReinjection,
  filterContextualModules
} = require('./preventLegacyModuleReinjection');
const { getCanonicalAllowSet } = require('./canonicalModuleMatrix');

function _governanceShouldApply(ctx = {}) {
  if (ctx.force_sidebar_governance) return true;
  if (ctx.real_enforcement_active === true) return true;
  try {
    const { isRealEnforcementActiveForTenant } = require('../realTenantEnforcement/realTenantEnforcementSupervisor');
    const tenantId = ctx.tenant_id || ctx.canonical_identity?.tenant_id;
    if (tenantId && isRealEnforcementActiveForTenant(tenantId, ctx)) {
      return true;
    }
  } catch {
    /* optional */
  }
  if (flags.isSidebarGovernanceRuntimeEnabled() && flags.isCanonicalModuleGovernanceEnabled()) {
    return true;
  }
  if (flags.isLegacyModuleProtectionEnabled() && flags.isContextualModuleHardeningEnabled()) {
    return true;
  }
  return false;
}

function _computeGovernanceScore(beforeLen, afterLen, leakageCount) {
  if (beforeLen === 0) return 1;
  const pruneRatio = 1 - afterLen / beforeLen;
  const leakPenalty = Math.min(leakageCount * 0.1, 0.5);
  return Math.max(0, Math.min(1, Math.round((1 - pruneRatio - leakPenalty) * 100) / 100));
}

/**
 * Resolve governança final do sidebar.
 */
function resolveSidebarGovernance(input = {}, ctx = {}) {
  const {
    visible_modules = [],
    contextual_modules = [],
    legacy_modules = [],
    profile = {},
    hierarchy = {},
    authority = {},
    domain = {},
    tenant = {}
  } = input;

  const mergedCtx = {
    ...ctx,
    tenant_id: tenant.id || ctx.tenant_id,
    profile_code: profile.code || ctx.profile_code,
    domain_axis: domain.axis || ctx.domain_axis || ctx.canonical_identity?.domain_axis,
    hierarchy_tier: hierarchy.tier || ctx.hierarchy_tier || ctx.canonical_identity?.hierarchy_tier,
    hierarchy_level: hierarchy.level ?? ctx.hierarchy_level ?? ctx.canonical_identity?.hierarchy_level,
    authority_scope: authority.scope || ctx.authority_scope,
    canonical_identity: ctx.canonical_identity
  };

  const allSources = [
    ...visible_modules,
    ...legacy_modules,
    ...contextual_modules.map((m) => m.module_id || m.menu_key).filter(Boolean)
  ];

  const leakageBefore = resolveModuleLeakage(allSources, {
    ...mergedCtx,
    observability_only: !_governanceShouldApply(mergedCtx)
  });

  const apply = _governanceShouldApply(mergedCtx);
  let finalVisible = [...visible_modules];
  let contextualFiltered = [...contextual_modules];
  let pruning = null;
  let reinjection = null;

  if (apply) {
    pruning = applySafeSidebarPruning(finalVisible, mergedCtx);
    finalVisible = pruning.visible_modules;
    reinjection = filterContextualModules(contextual_modules, mergedCtx);
    contextualFiltered = reinjection.items;
    if (flags.isLegacyModuleProtectionEnabled()) {
      const legacyBlock = preventLegacyModuleReinjection(legacy_modules, {
        ...mergedCtx,
        source: 'legacy_modules'
      });
      if (legacyBlock.blocked.length > 0) {
        reinjection.legacy_blocked = legacyBlock.blocked;
      }
    }
  } else {
    reinjection = { items: contextual_modules, blocked: [], reinjection_prevented: false };
  }

  const leakageAfter = resolveModuleLeakage(finalVisible, mergedCtx);
  const governance_score = _computeGovernanceScore(
    visible_modules.length,
    finalVisible.length,
    leakageAfter.leakage_count
  );

  if (leakageBefore.leakage_detected && flags.isSidebarObservabilityEnabled()) {
    logPhaseZ14('SIDEBAR_LEAKAGE_OBSERVED', {
      tenant_id: mergedCtx.tenant_id,
      domain: mergedCtx.domain_axis,
      count: leakageBefore.leakage_count,
      applied: apply
    });
  }

  return {
    governance_applied: apply,
    recommendation_only: !apply,
    final_visible_modules: finalVisible,
    final_contextual_modules: contextualFiltered,
    removed_modules: pruning?.removed_modules || [],
    preserved_modules: pruning?.preserved_modules || finalVisible,
    leakage_detected: leakageAfter.leakage_detected,
    leakage_before: leakageBefore,
    leakage_after: leakageAfter,
    applied_rules: pruning?.applied_rules || [],
    fallback_applied: pruning?.fallback_applied === true,
    fallback_modules: apply ? getCanonicalAllowSet(mergedCtx.domain_axis) : [],
    governance_score,
    authority_level: mergedCtx.authority_scope || mergedCtx.hierarchy_tier,
    domain: mergedCtx.domain_axis,
    hierarchy: mergedCtx.hierarchy_tier,
    reinjection,
    auto_remediate: false,
    shadow_only: !apply
  };
}

module.exports = { resolveSidebarGovernance, _governanceShouldApply };
