'use strict';

const { isModuleAllowedForContext } = require('../contextualEnforcement/moduleDeliveryClassification');

const UNIVERSAL = Object.freeze(['dashboard', 'settings', 'biblioteca', 'ai', 'chat', 'help', 'operational']);

function enforceTenantModuleIsolation(modules = [], ctx = {}) {
  const axis = ctx.canonical_identity?.domain_axis || ctx.domain_axis;
  const level = ctx.canonical_identity?.hierarchy_level ?? ctx.hierarchy_level ?? 3;
  const kept = [];
  const denied = [];

  for (const mod of modules) {
    const key = String(mod).toLowerCase();
    if (UNIVERSAL.includes(key)) {
      kept.push(mod);
      continue;
    }
    const check = isModuleAllowedForContext(mod, {
      domain_axis: axis,
      hierarchy_level: level,
      tenant_pilot_enabled: ctx.tenant_pilot_enabled === true
    });
    if (check.allowed) kept.push(mod);
    else denied.push({ module: mod, reason: check.reason });
  }

  return {
    visible_modules: [...new Set(kept)],
    denied,
    domain_axis: axis,
    isolation_applied: denied.length > 0,
    graceful: true
  };
}

module.exports = { enforceTenantModuleIsolation, UNIVERSAL };
