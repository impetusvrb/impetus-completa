'use strict';

function measureExecutiveAggregationCost(enterpriseBundle = {}) {
  const domains = Object.keys(enterpriseBundle.domains || {}).length;
  return { aggregation_cost: domains * 12, domains_aggregated: domains, safe: domains <= 6 };
}

module.exports = { measureExecutiveAggregationCost };
