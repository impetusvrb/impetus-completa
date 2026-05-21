'use strict';

const { classifyModuleList } = require('../contextualEnforcement/moduleDeliveryClassification');

function validateFunctionalIdentity(identity = {}, modules = []) {
  const axis = identity.domain_axis || 'unknown';
  const tier = identity.hierarchy_tier || 'coordination';
  const classified = classifyModuleList(modules);
  const cross_domain = [];
  const hierarchy_mismatch = [];

  for (const mod of modules) {
    const c = classified.find((x) => x.module_id === String(mod).toLowerCase()) || { module_id: mod };
    const domainList = c.domains;
    if (
      (c.classification === 'DOMAIN_ONLY' || c.classification === 'STRICT') &&
      domainList &&
      !domainList.includes('*')
    ) {
      const ok = domainList.some((d) => axis === d || String(axis).includes(d));
      if (!ok) cross_domain.push({ module: mod, expected_domains: domainList, actual_axis: axis, class: c.classification });
    }
    if (c.classification === 'EXECUTIVE_ONLY' && tier !== 'executive' && (identity.hierarchy_level || 3) > 2) {
      hierarchy_mismatch.push({ module: mod, reason: 'executive_only_on_non_executive' });
    }
    if (c.classification === 'OPERATIONAL_ONLY' && tier === 'executive') {
      hierarchy_mismatch.push({ module: mod, reason: 'operational_cockpit_on_executive' });
    }
  }

  return {
    valid: cross_domain.length === 0 && hierarchy_mismatch.length === 0,
    cross_domain,
    hierarchy_mismatch,
    module_count: modules.length,
    domain_axis: axis,
    hierarchy_tier: tier
  };
}

module.exports = { validateFunctionalIdentity };
