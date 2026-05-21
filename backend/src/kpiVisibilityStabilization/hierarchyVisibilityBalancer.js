'use strict';

const { inferHierarchyBand } = require('../kpiRollout/hierarchyKpiValidator');
const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');
const { kpiKey } = require('../kpiRuntimeEnforcement/domainKpiIsolation');

function balanceHierarchyVisibility(kpis = [], user = {}, ctx = {}) {
  const band = inferHierarchyBand(user, ctx);
  const tier = String(ctx.hierarchy_tier || band || '').toLowerCase();
  const balanced = [];
  const skewed = [];
  for (const k of kpis) {
    const d = inferKpiDomain(k);
    const execSkew = tier === 'operational' && d === 'executive';
    const opSkew = ['executive', 'director'].includes(tier) && d === 'operations' && k.operator_only;
    if (execSkew || opSkew) skewed.push({ kpi_id: kpiKey(k), reason: execSkew ? 'executive_skew' : 'operational_skew' });
    else balanced.push(k);
  }
  return { kpis: balanced, skewed, hierarchy_band: band, tier };
}

module.exports = { balanceHierarchyVisibility };
