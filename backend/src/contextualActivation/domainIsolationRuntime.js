'use strict';

const { isModuleAllowedForContext } = require('../contextualEnforcement/moduleDeliveryClassification');

function applyDomainIsolation(modules = [], ctx = {}) {
  const axis = ctx.domain_axis || ctx.canonical_identity?.domain_axis;
  const level = ctx.hierarchy_level ?? ctx.canonical_identity?.hierarchy_level ?? 3;
  const kept = [];
  const isolated = [];

  for (const mod of modules) {
    const check = isModuleAllowedForContext(mod, {
      domain_axis: axis,
      hierarchy_level: level,
      tenant_pilot_enabled: ctx.tenant_pilot_enabled
    });
    if (check.allowed) kept.push(mod);
    else isolated.push({ module: mod, reason: check.reason });
  }

  return {
    visible_modules: kept,
    isolated_modules: isolated,
    domain_axis: axis,
    graceful: true,
    hard_block: false
  };
}

module.exports = { applyDomainIsolation };
