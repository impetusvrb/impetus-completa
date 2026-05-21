'use strict';

const { normalizeModuleId } = require('../canonicalModuleGovernance/moduleAliasRegistry');
const { getCanonicalAllowSet } = require('../canonicalModuleGovernance/canonicalModuleMatrix');

function analyzeSidebarModuleDistribution(modules = [], ctx = {}) {
  const axis = ctx.domain_axis || 'unknown';
  const allowSet = getCanonicalAllowSet(axis);
  const normalized = modules.map(normalizeModuleId);
  const byDomain = { in_profile: [], out_of_profile: [], universal: [] };

  for (const m of normalized) {
    if (['dashboard', 'settings', 'ai', 'chat', 'biblioteca'].includes(m)) {
      byDomain.universal.push(m);
    } else if (allowSet.has(m)) {
      byDomain.in_profile.push(m);
    } else {
      byDomain.out_of_profile.push(m);
    }
  }

  return {
    domain_axis: axis,
    module_count: modules.length,
    normalized,
    distribution: byDomain,
    coherent: byDomain.out_of_profile.length === 0
  };
}

module.exports = { analyzeSidebarModuleDistribution };
