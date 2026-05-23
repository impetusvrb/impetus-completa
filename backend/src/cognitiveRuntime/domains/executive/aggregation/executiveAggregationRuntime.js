'use strict';

const { consolidateEnterpriseSignals } = require('./enterpriseSignalConsolidator');
const { aggregateStrategicDomains } = require('./strategicDomainAggregator');

function runExecutiveAggregationRuntime(payload = {}, ctx = {}) {
  const enterprise = consolidateEnterpriseSignals(payload, ctx);
  const strategic = aggregateStrategicDomains(enterprise);
  return { enterprise, strategic, aggregation_applied: true };
}

module.exports = { runExecutiveAggregationRuntime };
