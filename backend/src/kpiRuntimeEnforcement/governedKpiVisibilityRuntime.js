'use strict';

const { validateDomainKpis } = require('../kpiRollout/domainKpiValidator');
const { validateHierarchyKpis } = require('../kpiRollout/hierarchyKpiValidator');
const { kpiKey } = require('./domainKpiIsolation');

function applyGovernedKpiVisibility(kpis = [], user = {}, ctx = {}) {
  const domain = validateDomainKpis(user, kpis, ctx);
  const hierarchy = validateHierarchyKpis(user, kpis, ctx);
  const deny = new Set();
  for (const i of [...(domain.issues || []), ...(hierarchy.issues || [])]) {
    if (i.severity === 'critical' || i.severity === 'high') deny.add(String(i.kpi_id).toLowerCase());
  }
  const after = kpis.filter((k) => !deny.has(kpiKey(k)));
  return {
    kpis: after,
    denied: [...deny],
    domain,
    hierarchy
  };
}

module.exports = { applyGovernedKpiVisibility };
