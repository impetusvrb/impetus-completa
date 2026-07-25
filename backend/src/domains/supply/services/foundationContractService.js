'use strict';

const contracts = require('../contracts/interfaces');
const { SUPPLY_RUNTIME_IDENTITY } = require('../core/supplyRuntimeIdentity');

function getFoundationContract() {
  return {
    service: 'SupplyFoundationService',
    phase: 'GF-022',
    status: 'foundation',
    ready: false,
    runtime_id: SUPPLY_RUNTIME_IDENTITY.runtime_id,
    business_rules: false
  };
}

module.exports = {
  getFoundationContract,
  listCanonicalContracts: contracts.listContractTypes
};
