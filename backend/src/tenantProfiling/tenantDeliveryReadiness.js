'use strict';

const flags = require('../contextualEnforcement/config/phaseZ1FeatureFlags');
const { logPhaseZ1 } = require('../contextualEnforcement/phaseZ1Logger');
const { buildTenantOperationalProfile } = require('./tenantOperationalProfile');
const { assessTenantDomainCompleteness } = require('./tenantDomainCompleteness');
const { assessTenantHierarchyIntegrity } = require('./tenantHierarchyIntegrity');

function assessTenantDeliveryReadiness(tenantId, identity = {}, ctx = {}) {
  const profile = buildTenantOperationalProfile(tenantId, identity, ctx);
  const domain = assessTenantDomainCompleteness(identity);
  const hierarchy = assessTenantHierarchyIntegrity(identity);

  const incomplete = !domain.domain_complete || !hierarchy.hierarchy_integrity_ok || !profile.inference_complete;
  const readiness_score = Number(
    ((domain.completeness_score + hierarchy.integrity_score + (profile.inference_complete ? 1 : 0.5)) / 3).toFixed(4)
  );

  const enforcement_ready = !incomplete && readiness_score >= 0.75;

  if (incomplete && flags.isContextualEnforcementObservabilityEnabled()) {
    logPhaseZ1('TENANT_ENFORCEMENT_BLOCKED_INCOMPLETE', {
      tenant_id: tenantId,
      domain_missing: domain.missing_fields,
      hierarchy_missing: hierarchy.missing_fields,
      shadow_only: true
    });
  }

  return {
    tenant_id: tenantId,
    profile,
    domain,
    hierarchy,
    tenant_incomplete: incomplete,
    enforcement_ready,
    readiness_score,
    blocks_enforcement: incomplete,
    enforcement_applied: false
  };
}

module.exports = { assessTenantDeliveryReadiness };
