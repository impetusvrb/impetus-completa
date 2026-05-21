'use strict';

const { validateHierarchyKpis, inferHierarchyBand } = require('../kpiRollout/hierarchyKpiValidator');

function measureHierarchyKpiConvergence(user, kpis = [], ctx = {}) {
  const r = validateHierarchyKpis(user, kpis, ctx);
  const band = r.hierarchy_band || inferHierarchyBand(user, ctx);
  const score = r.hierarchy_accuracy ?? (r.valid ? 1 : 0.6);
  return {
    converged: r.valid && score >= 0.7,
    hierarchy_band: band,
    hierarchy_accuracy: score,
    issues: r.issues || []
  };
}

module.exports = { measureHierarchyKpiConvergence };
