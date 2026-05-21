'use strict';

const { isolateDomainKpis } = require('./domainKpiIsolation');
const { isolateHierarchyKpis } = require('./hierarchyKpiIsolation');

function pruneContextualKpis(kpis = [], user = {}, ctx = {}) {
  const d = isolateDomainKpis(kpis, ctx);
  const h = isolateHierarchyKpis(d.kpis, user, ctx);
  return {
    kpis: h.kpis,
    pruned_count: kpis.length - h.kpis.length,
    domain_removed: d.removed,
    hierarchy_removed: h.removed
  };
}

module.exports = { pruneContextualKpis };
