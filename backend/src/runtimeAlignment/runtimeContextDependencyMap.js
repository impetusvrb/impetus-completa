'use strict';

const { buildDependencyGraph } = require('./runtimeDependencyGraphBuilder');

function getContextDependencyMap(ctx = {}) {
  const graph = buildDependencyGraph();
  return {
    ...graph,
    tenant_id: ctx.tenant_id || null,
    axis: ctx.functional_axis || null,
    recommendation: 'migrate_legacy_enrichers_to_governed_channels'
  };
}

module.exports = { getContextDependencyMap };
