'use strict';

const { validateKpiTargeting } = require('./kpiTargetingValidator');
const { validateHierarchyKpis } = require('./hierarchyKpiValidator');
const { validateDomainKpis } = require('./domainKpiValidator');

function validateOperationalKpiDelivery(user, kpiPayload, ctx = {}) {
  const targeting = validateKpiTargeting(user, kpiPayload, ctx);
  const hierarchy = validateHierarchyKpis(user, kpiPayload, ctx);
  const domain = validateDomainKpis(user, kpiPayload, ctx);

  const valid = targeting.valid && hierarchy.valid && domain.valid;
  const confidence = Number(
    ((targeting.targeting_precision + hierarchy.hierarchy_accuracy + domain.domain_isolation_score) / 3).toFixed(4)
  );

  return {
    valid,
    KPI_delivery_confidence: confidence,
    targeting,
    hierarchy,
    domain,
    issues: [...targeting.issues, ...hierarchy.issues, ...domain.issues]
  };
}

module.exports = { validateOperationalKpiDelivery };
