'use strict';

const { MINIMUM_MODULES } = require('../pilotTenants/pilotTenantRegistry');

function applyMenuFallbackProtection(modules = [], ctx = {}) {
  const tier = ctx.canonical_identity?.hierarchy_tier || ctx.hierarchy_tier || 'coordination';
  const axis = ctx.canonical_identity?.domain_axis || ctx.functional_axis || 'operations';

  const fallback = [...MINIMUM_MODULES];
  if (tier === 'executive') fallback.push('biblioteca', 'ai');
  else if (tier === 'operational') fallback.push('operational', 'proaction');
  else if (axis === 'hr') fallback.push('hr_intelligence');
  else if (axis === 'quality') fallback.push('quality_intelligence');
  else fallback.push('operational');

  const merged = [...new Set([...fallback, ...modules])];
  const used_fallback = modules.length < MINIMUM_MODULES.length;

  return {
    visible_modules: merged,
    fallback_applied: used_fallback,
    fallback_modules: fallback,
    frontend_safe: merged.includes('dashboard')
  };
}

module.exports = { applyMenuFallbackProtection };
