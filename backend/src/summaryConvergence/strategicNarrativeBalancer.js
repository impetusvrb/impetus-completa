'use strict';

const { measureHierarchyNarrativeConvergence } = require('./hierarchyNarrativeConvergence');

function balanceStrategicNarrative(summaryPayload = {}, user = {}, ctx = {}) {
  const h = measureHierarchyNarrativeConvergence(user, summaryPayload, ctx);
  return { balanced: h.converged, skew: h.converged ? null : 'hierarchy_narrative_skew' };
}

module.exports = { balanceStrategicNarrative };
