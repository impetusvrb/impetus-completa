'use strict';

const { isolateHierarchyKpis } = require('../kpiRuntimeEnforcement/hierarchyKpiIsolation');

function isolateKpisByHierarchy(kpis = [], user = {}, ctx = {}) {
  try {
    return isolateHierarchyKpis(kpis, user, ctx);
  } catch {
    return { kpis, removed: [], graceful: true };
  }
}

module.exports = { isolateKpisByHierarchy };
