'use strict';

const { analyzeCockpitConsistency } = require('./cockpitConsistencyAnalyzer');
const { assessContextualDashboardConsistency } = require('./contextualDashboardConsistency');
const { assessHierarchyDashboardIntegrity } = require('./hierarchyDashboardIntegrity');
const { assessFunctionalDashboardIntegrity } = require('./functionalDashboardIntegrity');

function runCockpitConvergenceRuntime(kpis = [], user = {}, ctx = {}) {
  const cockpit = analyzeCockpitConsistency(kpis, ctx);
  const contextual = assessContextualDashboardConsistency(kpis, ctx);
  const hierarchy = assessHierarchyDashboardIntegrity(user, kpis, ctx);
  const functional = assessFunctionalDashboardIntegrity(user, kpis, ctx);
  const score =
    (cockpit.consistent ? 0.3 : 0) +
    (contextual.consistent ? 0.25 : 0) +
    (hierarchy.valid ? 0.25 : 0) +
    (functional.valid ? 0.2 : 0);
  return {
    cockpit_convergence_score: Number(Math.min(1, score).toFixed(4)),
    cockpit,
    contextual,
    hierarchy,
    functional
  };
}

module.exports = { runCockpitConvergenceRuntime };
