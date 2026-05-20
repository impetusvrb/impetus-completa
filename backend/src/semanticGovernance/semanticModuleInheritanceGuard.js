'use strict';

const { logPhaseK } = require('./phaseKLogger');

/**
 * Extensão semântica sobre domain moduleInheritanceGuard — sem cargo.includes.
 */
function applySemanticInheritance(modules, ctx = {}) {
  const axis = ctx.functional_axis || ctx.functional_area || 'general';
  let result = { modules: [...(modules || [])], blocked: [] };

  try {
    const domainAuthority = require('../domainAuthority');
    if (domainAuthority.isDomainAuthorityEnabled && domainAuthority.isDomainAuthorityEnabled()) {
      const inh = domainAuthority.moduleInheritanceGuard.filterModulesWithInheritance(modules, axis, {
        user_id: ctx.user_id
      });
      result = { modules: inh.modules, blocked: inh.blocked || [] };
    }
  } catch {
    /* optional */
  }

  const axisNorm = String(axis).toLowerCase();
  const extraBlocked = [];
  const filtered = [];

  for (const mod of result.modules) {
    const id = String(mod).toLowerCase();
    let ok = true;
    let reason = null;

    if (axisNorm === 'safety' && (id.includes('quality') || id === 'qualidade')) {
      ok = false;
      reason = 'semantic_safety_quality_isolation';
    }
    if (axisNorm === 'quality' && (id === 'sst' || id.includes('safety_ehs'))) {
      ok = false;
      reason = 'semantic_quality_safety_isolation';
    }
    if (axisNorm === 'safety' && id.includes('executive') && !ctx.executive_override) {
      ok = false;
      reason = 'semantic_operational_executive_leak';
    }

    if (ok) filtered.push(mod);
    else {
      extraBlocked.push({ module: mod, reason });
      logPhaseK('SEMANTIC_INHERITANCE_BLOCKED', { module: mod, axis: axisNorm, reason, shadow_only: ctx.shadow_only });
    }
  }

  return {
    modules: filtered,
    blocked: [...result.blocked, ...extraBlocked]
  };
}

module.exports = { applySemanticInheritance };
