'use strict';

function learnDashboardStress(store = {}) {
  const snapshots = store.snapshots || [];
  const stressed = snapshots.filter((s) => (s.cross_domain_pressure ?? 0) > 0.5).length;
  return { stress_patterns: stressed >= 2 ? [{ id: 'dashboard_stress', count: stressed }] : [] };
}

module.exports = { learnDashboardStress };
