'use strict';

const { validateHierarchyKpis } = require('../kpiRollout/hierarchyKpiValidator');

function validateKpiHierarchyIsolation(user, kpis = [], ctx = {}) {
  let result = { valid: true, issues: [] };
  try {
    result = validateHierarchyKpis(user, kpis, ctx);
  } catch {
    result = { valid: true, issues: [], simulation_only: true };
  }
  return { ...result, simulation_only: true, enforcement_applied: false };
}

module.exports = { validateKpiHierarchyIsolation };
