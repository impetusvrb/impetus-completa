'use strict';

const { applyGovernedMenuVisibility } = require('./governedMenuVisibilityRuntime');
const { applyContextualMenuIsolation } = require('./contextualMenuIsolation');
const { filterMenuByHierarchy } = require('./hierarchyMenuFiltering');
const { adviseLegacyMenuReduction } = require('./legacyMenuReductionAdvisor');
const { stabilizeMenuGovernance } = require('./menuGovernanceStability');
const { runTenantContextualPruningRuntime } = require('../realTenantEnforcement/tenantContextualPruningRuntime');

function getRealMenuGovernanceStatus(ctx = {}) {
  return {
    phase: 'Z.13',
    layer: 'real-menu-governance',
    tenant_id: ctx.tenant_id,
    advisory_reduction: true,
    auto_remediate: false
  };
}

function applyRealMenuGovernance(modules = [], user = {}, ctx = {}) {
  const before = [...modules];
  const governed = applyGovernedMenuVisibility(before, user, ctx);
  let current = governed.visible_modules;

  if (governed.enforcement_applied) {
    const isolated = applyContextualMenuIsolation(current, ctx);
    current = isolated.visible_modules;
    const hierarchy = filterMenuByHierarchy(current, ctx);
    current = hierarchy.visible_modules;
    const pruned = runTenantContextualPruningRuntime(current, ctx);
    current = pruned.after;
    const stable = stabilizeMenuGovernance(current, ctx);
    current = stable.visible_modules;
  }

  const advisory = adviseLegacyMenuReduction(before, ctx);

  return {
    visible_modules: current,
    before,
    enforcement_applied: governed.enforcement_applied,
    shadow_only: governed.shadow_only,
    governed,
    advisory,
    pruned_count: before.length - current.length,
    removed: before.filter((m) => !current.includes(m)),
    graceful_degradation: true,
    fabricated: false
  };
}

function getRealMenuGovernanceReport(user = {}, ctx = {}) {
  const modules = ctx.visible_modules || [];
  return {
    ok: true,
    status: getRealMenuGovernanceStatus({ tenant_id: user?.company_id }),
    targeting: applyRealMenuGovernance(modules, user, ctx),
    hierarchy: filterMenuByHierarchy(modules, ctx),
    advisory: adviseLegacyMenuReduction(modules, ctx)
  };
}

module.exports = {
  getRealMenuGovernanceStatus,
  applyRealMenuGovernance,
  getRealMenuGovernanceReport
};
