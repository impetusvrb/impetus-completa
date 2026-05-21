'use strict';

const { enforceHierarchyVisibility } = require('../contextualActivation/hierarchyVisibilityEnforcer');

function filterMenuByHierarchy(modules = [], ctx = {}) {
  return enforceHierarchyVisibility(modules, ctx);
}

module.exports = { filterMenuByHierarchy };
