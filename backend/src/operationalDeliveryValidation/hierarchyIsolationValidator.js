'use strict';

function validateHierarchyIsolation(modules = [], ctx = {}) {
  return require('../runtimeObservation/hierarchyMismatchObserver').observeHierarchyMismatch({
    visible_modules: modules,
    hierarchy_level: ctx.hierarchy_level,
    profile_code: ctx.profile_code,
    canonical_identity: ctx.canonical_identity
  });
}

module.exports = { validateHierarchyIsolation };
