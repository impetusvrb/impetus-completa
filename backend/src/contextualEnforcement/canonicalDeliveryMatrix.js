'use strict';

const domainRegistry = require('../domainAuthority/registry/domainRegistry');
const { classifyModuleList, isModuleAllowedForContext } = require('./moduleDeliveryClassification');

function buildCanonicalDeliveryMatrix(identity = {}, ctx = {}) {
  const axis = identity.domain_axis || identity.functional_axis || 'unknown';
  let domain;
  try {
    domain = domainRegistry.getDomain(domainRegistry.normalizeAxis(axis));
  } catch {
    domain = { allowed_modules: [], denied_modules: [], widgets: [], dashboards: [] };
  }

  const hierarchy_level = identity.hierarchy_level ?? ctx.hierarchy_level ?? 3;
  const delivered = ctx.visible_modules || [];
  const classified = classifyModuleList(delivered);

  const permitted = [];
  const would_block = [];
  for (const mod of delivered) {
    const check = isModuleAllowedForContext(mod, {
      domain_axis: axis,
      hierarchy_level,
      tenant_pilot_enabled: ctx.tenant_pilot_enabled
    });
    if (check.allowed) permitted.push(mod);
    else would_block.push({ module: mod, ...check });
  }

  return {
    tenant_id: identity.tenant_id,
    profile_code: identity.profile_code,
    domain_axis: axis,
    hierarchy_level,
    role: identity.role,
    operational_scope: identity.operational_scope,
    allowed_modules_canonical: domain.allowed_modules || [],
    denied_modules_canonical: domain.denied_modules || [],
    permitted_modules_simulation: permitted,
    would_block_simulation: would_block,
    widgets_canonical: domain.widgets || [],
    dashboards_canonical: domain.dashboards || [],
    kpis_canonical: ctx.kpis_allowed || [],
    summaries_canonical: domain.ai_contexts || [],
    module_classifications: classified,
    matrix_version: 'Z.1',
    enforcement_applied: false
  };
}

module.exports = { buildCanonicalDeliveryMatrix };
