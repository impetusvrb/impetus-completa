'use strict';

const { isModuleAllowedForContext } = require('../contextualEnforcement/moduleDeliveryClassification');

function validateRuntimeDelivery(modules = [], ctx = {}) {
  const violations = [];
  for (const mod of modules) {
    const c = isModuleAllowedForContext(mod, {
      domain_axis: ctx.domain_axis,
      hierarchy_level: ctx.hierarchy_level
    });
    if (!c.allowed) violations.push({ module: mod, reason: c.reason });
  }
  return { valid: violations.length === 0, violations };
}

module.exports = { validateRuntimeDelivery };
