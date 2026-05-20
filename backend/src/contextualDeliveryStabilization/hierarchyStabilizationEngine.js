'use strict';

const phaseP = require('./config/phasePFeatureFlags');
const { resolveHierarchy } = require('./contextualHierarchyResolver');
const { isolateByHierarchy } = require('./hierarchyIsolationResolver');
const { normalizeHierarchyContext } = require('./hierarchyContextNormalizer');

function stabilizeHierarchy(user, modules = [], ctx = {}) {
  const hierarchy = resolveHierarchy(user, ctx);
  const normalized = normalizeHierarchyContext({ hierarchy });
  const results = (modules || []).map((m) => {
    const id = typeof m === 'string' ? m : m.id || m;
    const iso = isolateByHierarchy(id, hierarchy.hierarchy_band);
    return { module_id: id, ...iso };
  });
  const denied = results.filter((r) => !r.allowed);
  const enforcement = phaseP.isHierarchyStabilizationEnabled();

  return {
    hierarchy,
    normalized,
    module_results: results,
    denied_hierarchy: denied,
    hierarchy_integrity: denied.length === 0 ? 0.95 : Math.max(0.5, 0.95 - denied.length * 0.08),
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    stabilized_modules: enforcement ? results.filter((r) => r.allowed).map((r) => r.module_id) : modules
  };
}

module.exports = { stabilizeHierarchy };
