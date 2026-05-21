'use strict';

const { isModuleAllowedByDomain } = require('./domainModuleMatrix');
const { isModuleDeniedByHierarchy } = require('./hierarchyModuleMatrix');
const { isModuleDeniedByAuthority } = require('./authorityModuleMatrix');
const { normalizeModuleId } = require('./moduleAliasRegistry');

function resolveModuleLeakage(modules = [], ctx = {}) {
  const axis = ctx.domain_axis || ctx.canonical_identity?.domain_axis;
  const leaks = [];

  for (const mod of modules) {
    const key = normalizeModuleId(mod);
    const domain = isModuleAllowedByDomain(key, axis);
    const hierarchy = isModuleDeniedByHierarchy(key, ctx);
    const authority = isModuleDeniedByAuthority(key, ctx);

    if (!domain.allowed) {
      leaks.push({ module: mod, normalized: key, reason: domain.reason, layer: 'domain' });
    } else if (hierarchy.denied) {
      leaks.push({ module: mod, normalized: key, reason: hierarchy.reason, layer: 'hierarchy' });
    } else if (authority.denied) {
      leaks.push({ module: mod, normalized: key, reason: authority.reason, layer: 'authority' });
    }
  }

  return {
    leakage_detected: leaks.length > 0,
    leaks,
    leakage_count: leaks.length,
    domain_axis: axis,
    hierarchy: ctx.hierarchy_tier,
    observability_only: ctx.observability_only !== false
  };
}

module.exports = { resolveModuleLeakage };
