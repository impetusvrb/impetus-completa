'use strict';

const { measureHierarchyKpiConvergence } = require('../kpiConvergence/hierarchyKpiConvergence');

function assessHierarchyDashboardIntegrity(user, kpis = [], ctx = {}) {
  const h = measureHierarchyKpiConvergence(user, kpis, ctx);
  return { integrity: h.hierarchy_accuracy, valid: h.converged };
}

module.exports = { assessHierarchyDashboardIntegrity };
