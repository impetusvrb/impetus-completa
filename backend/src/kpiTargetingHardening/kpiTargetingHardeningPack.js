'use strict';

const flags = require('../kpiRuntimeStability/config/phaseZ6FeatureFlags');
const { hardenHierarchyKpiTargeting } = require('./hierarchyKpiTargetingHardening');
const { hardenFunctionalKpiTargeting } = require('./functionalKpiTargetingHardening');
const { assessTenantKpiTargetingIntegrity } = require('./tenantKpiTargetingIntegrity');
const { runKpiAuthorityConsistency } = require('./kpiAuthorityConsistencyRuntime');
const { hardenKpiCrossDomain } = require('./kpiCrossDomainHardening');

function runKpiTargetingHardening(user, kpis = [], ctx = {}) {
  const tenantId = ctx.tenant_id || user?.company_id;
  return {
    hierarchy: hardenHierarchyKpiTargeting(user, kpis, ctx),
    functional: hardenFunctionalKpiTargeting(user, kpis, ctx),
    tenant: assessTenantKpiTargetingIntegrity(tenantId),
    authority: runKpiAuthorityConsistency(user, kpis, ctx),
    cross_domain: hardenKpiCrossDomain(user, kpis, ctx),
    hardening_active: flags.isKpiTargetingHardeningEnabled(),
    recommendation_only: !flags.isKpiTargetingHardeningEnabled()
  };
}

module.exports = { runKpiTargetingHardening };
