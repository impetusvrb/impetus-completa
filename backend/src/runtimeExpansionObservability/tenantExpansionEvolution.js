'use strict';

function buildTenantExpansionEvolution(pack = {}) {
  return {
    classification: pack.expansion?.classification?.classification,
    maturity_score: pack.expansion?.expansion_maturity_score,
    scaling_ready: pack.readiness?.scaling_ready,
    phase: 'Z.11'
  };
}

module.exports = { buildTenantExpansionEvolution };
