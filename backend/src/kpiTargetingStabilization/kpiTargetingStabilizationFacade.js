'use strict';

const { analyzeKpiTargetingStability } = require('./kpiTargetingStabilityAnalyzer');
const { assessKpiHierarchyConsistency } = require('./kpiHierarchyConsistency');
const { assessKpiFunctionalConsistency } = require('./kpiFunctionalConsistency');
const { assessKpiTenantConsistency } = require('./kpiTenantConsistency');
const { assessKpiConvergenceHealth } = require('./kpiConvergenceHealth');

function analyzeKpiTargetingStabilityPack(user, kpis = [], ctx = {}) {
  const before = ctx.kpis_before || kpis;
  const stability = analyzeKpiTargetingStability(before, kpis, ctx);
  const hierarchy = assessKpiHierarchyConsistency(user, kpis, ctx);
  const functional = assessKpiFunctionalConsistency(user, kpis, ctx);
  const tenant = assessKpiTenantConsistency(ctx.tenant_id || user?.company_id, ctx);
  const convergence = assessKpiConvergenceHealth({ hierarchy, functional, stability, tenant });

  return {
    stability,
    hierarchy,
    functional,
    tenant,
    convergence,
    recommendation_only: true
  };
}

module.exports = { analyzeKpiTargetingStability: analyzeKpiTargetingStabilityPack };
