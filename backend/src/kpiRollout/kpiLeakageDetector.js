'use strict';

const phaseT = require('./config/phaseTFeatureFlags');
const { logPhaseT } = require('./phaseTLogger');
const { validateDomainKpis } = require('./domainKpiValidator');
const { validateHierarchyKpis } = require('./hierarchyKpiValidator');

function detectKpiLeakage(user, kpiPayload, ctx = {}) {
  const domain = validateDomainKpis(user, kpiPayload, ctx);
  const hierarchy = validateHierarchyKpis(user, kpiPayload, ctx);
  const leaks = [
    ...domain.issues.filter((i) => i.type === 'cross_domain_exposure' || i.type === 'domain_overlap'),
    ...hierarchy.issues.filter((i) => i.type === 'executive_kpi_leakage' || i.type === 'hierarchy_too_high')
  ];

  if (leaks.length && phaseT.isKpiGovernanceObservabilityEnabled()) {
    logPhaseT('KPI_LEAKAGE_DETECTED', { count: leaks.length, tenant_id: ctx.tenant_id, shadow_only: true });
  }

  return {
    leakage_detected: leaks.length > 0,
    leakage_count: leaks.length,
    leaks,
    enforcement_active: phaseT.isKpiDeliveryStabilizationEnabled()
  };
}

module.exports = { detectKpiLeakage };
