'use strict';

const { validateHierarchyKpis } = require('../kpiRollout/hierarchyKpiValidator');

function assessKpiHierarchyConsistency(user, kpis = [], ctx = {}) {
  const r = validateHierarchyKpis(user, kpis, ctx);
  return { consistent: r.valid, hierarchy_band: r.hierarchy_band, issues: r.issues };
}

module.exports = { assessKpiHierarchyConsistency };
