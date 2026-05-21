'use strict';

const { isModuleAllowedForContext } = require('../contextualEnforcement/moduleDeliveryClassification');

function detectDomainLeakage(modules = [], identity = {}) {
  const axis = identity.domain_axis || 'unknown';
  const leaks = [];
  for (const mod of modules) {
    const check = isModuleAllowedForContext(mod, {
      domain_axis: axis,
      hierarchy_level: identity.hierarchy_level ?? 3
    });
    if (!check.allowed && check.reason !== 'tenant_pilot_required') {
      leaks.push({ module: mod, reason: check.reason, axis });
    }
  }
  return { leaks, count: leaks.length, domain_axis: axis };
}

module.exports = { detectDomainLeakage };
