'use strict';

const { inferKpiDomain } = require('../kpiRollout/kpiDomainRegistry');
const { kpiKey } = require('../kpiRuntimeEnforcement/domainKpiIsolation');

const STRATEGIC = ['executive', 'financial'];

function preserveExecutiveStrategicKpis(filtered = [], original = [], ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (!['executive', 'director'].includes(tier)) return { kpis: filtered, preserved: [] };
  const keys = new Set(filtered.map(kpiKey));
  const preserved = [];
  for (const k of original) {
    const d = inferKpiDomain(k);
    if (STRATEGIC.includes(d) && !keys.has(kpiKey(k))) {
      preserved.push(k);
      keys.add(kpiKey(k));
    }
  }
  return { kpis: [...filtered, ...preserved], preserved };
}

module.exports = { preserveExecutiveStrategicKpis };
