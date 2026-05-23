'use strict';

function orchestrateEnterpriseAlignment(payload = {}, convergence = {}) {
  return {
    alignment: convergence.enterprise_aligned ? 'aligned' : 'watch',
    supervised_rebalance: !convergence.enterprise_aligned,
    auto_mutation: false
  };
}

module.exports = { orchestrateEnterpriseAlignment };
