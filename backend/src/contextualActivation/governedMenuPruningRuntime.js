'use strict';

const { applyDomainIsolation } = require('./domainIsolationRuntime');
const { enforceHierarchyVisibility } = require('./hierarchyVisibilityEnforcer');

function applyGovernedMenuPruning(modules = [], ctx = {}) {
  const before = [...modules];
  const domain = applyDomainIsolation(modules, ctx);
  const hierarchy = enforceHierarchyVisibility(domain.visible_modules, ctx);

  const baseline = ['dashboard', 'settings'];
  const final = [...new Set([...baseline, ...hierarchy.visible_modules])];

  return {
    before,
    after: final,
    pruned_count: before.length - final.length,
    pruned_modules: before.filter((m) => !final.includes(m)),
    domain_isolation: domain,
    hierarchy_enforcement: hierarchy,
    permanent_remove: false,
    graceful_degradation: true
  };
}

module.exports = { applyGovernedMenuPruning };
