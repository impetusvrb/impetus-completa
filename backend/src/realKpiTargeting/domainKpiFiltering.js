'use strict';

const { pruneContextualKpis } = require('../kpiRuntimeEnforcement/contextualKpiPruningRuntime');

function filterKpisByDomain(kpis = [], user = {}, ctx = {}) {
  return pruneContextualKpis(kpis, user, ctx);
}

module.exports = { filterKpisByDomain };
