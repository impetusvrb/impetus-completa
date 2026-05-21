'use strict';

const { CLASSIFICATION, classifyModule } = require('../contextualEnforcement/moduleDeliveryClassification');

function enforceHierarchyVisibility(modules = [], ctx = {}) {
  const level = ctx.hierarchy_level ?? ctx.canonical_identity?.hierarchy_level ?? 3;
  const tier = ctx.hierarchy_tier ?? ctx.canonical_identity?.hierarchy_tier;
  const kept = [];
  const deferred = [];

  for (const mod of modules) {
    const c = classifyModule(mod);
    if (c.classification === CLASSIFICATION.EXECUTIVE_ONLY && level > 2) {
      deferred.push({ module: mod, reason: 'executive_only' });
      continue;
    }
    if (c.classification === CLASSIFICATION.OPERATIONAL_ONLY && level <= 2 && tier === 'executive') {
      deferred.push({ module: mod, reason: 'operational_only_on_executive' });
      continue;
    }
    kept.push(mod);
  }

  return {
    visible_modules: kept,
    hierarchy_deferred: deferred,
    hierarchy_level: level,
    graceful: true
  };
}

module.exports = { enforceHierarchyVisibility };
