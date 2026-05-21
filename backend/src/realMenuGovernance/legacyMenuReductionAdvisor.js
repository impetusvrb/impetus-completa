'use strict';

const { classifyModuleList } = require('../contextualEnforcement/moduleDeliveryClassification');

function adviseLegacyMenuReduction(modules = [], ctx = {}) {
  const classified = classifyModuleList(modules);
  const axis = ctx.canonical_identity?.domain_axis || ctx.domain_axis || 'unknown';
  const recommendations = [];

  for (const c of classified) {
    if (c.classification === 'DOMAIN_ONLY' && c.domains && !c.domains.includes('*')) {
      const ok = c.domains.some((d) => axis === d || String(axis).includes(d));
      if (!ok) {
        recommendations.push({
          module_id: c.module_id,
          action: 'reduce',
          reason: 'cross_domain_legacy',
          simulation_only: true
        });
      }
    }
    if (c.classification === 'STRICT' && c.domains) {
      const ok = c.domains.some((d) => axis === d || String(axis).includes(d));
      if (!ok) {
        recommendations.push({
          module_id: c.module_id,
          action: 'reduce',
          reason: 'strict_domain_mismatch',
          simulation_only: true
        });
      }
    }
  }

  return {
    domain_axis: axis,
    recommendations,
    auto_apply: false,
    advisory_only: true
  };
}

module.exports = { adviseLegacyMenuReduction };
