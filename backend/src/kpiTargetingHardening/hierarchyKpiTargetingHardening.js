'use strict';

const { validateHierarchyKpis } = require('../kpiRollout/hierarchyKpiValidator');

function hardenHierarchyKpiTargeting(user, kpis = [], ctx = {}) {
  const r = validateHierarchyKpis(user, kpis, ctx);
  return { hardened: r.valid, hierarchy_band: r.hierarchy_band, issues: r.issues };
}

module.exports = { hardenHierarchyKpiTargeting };
