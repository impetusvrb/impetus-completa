'use strict';

function measureOrchestrationCost(report = {}) {
  const recs = report.recommendations?.recommendation_count ?? 0;
  return { orchestration_cost: recs * 2 + 10, domains_analyzed: 6 };
}

module.exports = { measureOrchestrationCost };
