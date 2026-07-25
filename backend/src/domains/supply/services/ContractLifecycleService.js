'use strict';

const { contractRenewalPolicy } = require('../policies/supplyDomainPolicies');
const { CONTRACT_STATUS } = require('../semantics/supplyCoreSemantics');
const { createDomainEvent } = require('../events/supplyDomainEvents');

class ContractLifecycleService {
  sign(contract) {
    if (contract.status !== CONTRACT_STATUS.PENDING_SIGNATURE && contract.status !== CONTRACT_STATUS.DRAFT) {
      throw new Error('Contract: invalid status for signature');
    }
    const signed = Object.freeze({ ...contract, status: CONTRACT_STATUS.ACTIVE, signedAt: new Date().toISOString() });
    return {
      contract: signed,
      event: createDomainEvent('supply.contract.signed', { contractId: signed.id })
    };
  }

  evaluateRenewal(contract, context = {}) {
    const policy = contractRenewalPolicy(contract, context);
    if (policy.action === 'expire') {
      return {
        contract: Object.freeze({ ...contract, status: CONTRACT_STATUS.EXPIRED }),
        event: createDomainEvent('supply.contract.expired', { contractId: contract.id }),
        policy
      };
    }
    return { contract, event: null, policy };
  }
}

module.exports = { ContractLifecycleService };
