'use strict';

const aggregates = require('../model/aggregates');
const { approvalPolicy, budgetCompliancePolicy } = require('../policies/supplyDomainPolicies');
const { PURCHASE_REQUEST_STATUS } = require('../semantics/supplyCoreSemantics');
const { createDomainEvent } = require('../events/supplyDomainEvents');

class PurchaseRequestService {
  createDraft(input) {
    return aggregates.purchaseRequest.createPurchaseRequestAggregate({
      ...input,
      status: input.status != null ? input.status : PURCHASE_REQUEST_STATUS.DRAFT
    });
  }

  submit(aggregate) {
    const submitted = aggregates.purchaseRequest.submitPurchaseRequest(aggregate);
    const budgetCheck = budgetCompliancePolicy(submitted.budgetReference, submitted.totalAmount);
    if (!budgetCheck.compliant) {
      throw new Error(`PurchaseRequest: budget non-compliant — ${budgetCheck.reason}`);
    }
    const flow = approvalPolicy({ amount: submitted.totalAmount.amount });
    const withFlow = aggregates.purchaseRequest.createPurchaseRequestAggregate({
      ...submitted,
      approvalFlow: flow.steps,
      status: PURCHASE_REQUEST_STATUS.UNDER_APPROVAL
    });
    return {
      aggregate: withFlow,
      event: createDomainEvent('supply.request.created', { requestNumber: withFlow.requestNumber })
    };
  }

  approve(aggregate) {
    const approved = aggregates.purchaseRequest.approvePurchaseRequest(aggregate);
    return {
      aggregate: approved,
      event: createDomainEvent('supply.request.approved', { requestNumber: approved.requestNumber })
    };
  }
}

module.exports = { PurchaseRequestService };
