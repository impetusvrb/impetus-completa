'use strict';

const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');
const { inferHierarchyBand } = require('../kpiRollout/hierarchyKpiValidator');
const { kpiKey } = require('./domainKpiIsolation');

function isolateHierarchyKpis(kpis = [], user = {}, ctx = {}) {
  const tier = String(ctx.hierarchy_tier || inferHierarchyBand(user, ctx) || '').toLowerCase();
  const kept = [];
  const removed = [];

  for (const k of kpis) {
    const domain = inferKpiDomain(k);
    const execLeak = tier === 'operational' && (domain === 'executive' || k.executive_only === true);
    if (execLeak) removed.push({ kpi_id: kpiKey(k), reason: 'executive_leakage' });
    else kept.push(k);
  }

  return { kpis: kept, removed, tier };
}

module.exports = { isolateHierarchyKpis };
