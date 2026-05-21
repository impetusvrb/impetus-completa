'use strict';

function analyzeGovernanceLoad(z10Pack = {}, ctx = {}) {
  const load = z10Pack.consolidation?.pressure?.load?.governance_load ?? 0;
  const layers = ctx.observability_layers ?? 6;
  const total = Math.min(1, load + layers * 0.05);
  return {
    governance_load: total,
    overload: total > 0.6,
    runtime_overload: total > 0.75
  };
}

module.exports = { analyzeGovernanceLoad };
