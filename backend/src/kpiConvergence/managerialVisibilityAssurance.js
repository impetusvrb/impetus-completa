'use strict';

const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');

function assureManagerialVisibility(kpis = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || 'coordination').toLowerCase();
  if (!['coordination', 'supervisor', 'director'].includes(tier)) {
    return { assured: true, not_applicable: true };
  }
  const managerial = kpis.filter((k) => {
    const d = inferKpiDomain(k);
    return ['operations', 'quality', 'hr', 'general'].includes(d) || k.managerial === true;
  }).length;
  const ratio = kpis.length ? managerial / kpis.length : 0;
  return {
    assured: kpis.length >= 2 && ratio >= 0.4,
    managerial_ratio: Number(ratio.toFixed(4)),
    kpi_count: kpis.length
  };
}

module.exports = { assureManagerialVisibility };
