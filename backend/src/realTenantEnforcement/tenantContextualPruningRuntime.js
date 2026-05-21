'use strict';

const { applyGovernedMenuPruning } = require('../contextualActivation/governedMenuPruningRuntime');

function runTenantContextualPruningRuntime(modules = [], ctx = {}) {
  const before = [...modules];
  const pruned = applyGovernedMenuPruning(before, ctx);
  return {
    before,
    after: pruned.after,
    pruned_count: pruned.pruned_count,
    pruned_modules: pruned.pruned_modules,
    domain_isolation: pruned.domain_isolation,
    hierarchy_enforcement: pruned.hierarchy_enforcement,
    permanent_remove: false,
    graceful_degradation: true,
    shadow_only: false
  };
}

module.exports = { runTenantContextualPruningRuntime };
