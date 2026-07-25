'use strict';

const { PURCHASE_REQUEST_STATUS } = require('../../semantics/supplyCoreSemantics');
const {
  createRequestLine,
  createBudgetReference,
  createSupplierSuggestion,
  createApprovalStep,
  createMoney
} = require('../valueObjects');

function createPurchaseRequestAggregate(input = {}) {
  const items = (input.items || []).map((it, i) => createRequestLine({ ...it, lineNumber: i + 1 }));
  const approvalFlow = (input.approvalFlow || []).map(createApprovalStep);
  const budgetReference = input.budgetReference ? createBudgetReference(input.budgetReference) : null;
  const supplierSuggestions = (input.supplierSuggestions || []).map(createSupplierSuggestion);

  const totalAmount = items.reduce((sum, line) => {
    const ext = line.extendedAmount?.amount ?? 0;
    return sum + ext;
  }, 0);

  return Object.freeze({
    aggregate: 'PurchaseRequest',
    id: input.id || null,
    requestNumber: input.requestNumber || null,
    buyerId: input.buyerId || null,
    categoryId: input.categoryId || null,
    status: input.status || PURCHASE_REQUEST_STATUS.DRAFT,
    items: Object.freeze(items),
    approvalFlow: Object.freeze(approvalFlow),
    budgetReference,
    supplierSuggestions: Object.freeze(supplierSuggestions),
    totalAmount: createMoney(totalAmount),
    companyId: input.companyId || null
  });
}

function submitPurchaseRequest(aggregate) {
  if (aggregate.status !== PURCHASE_REQUEST_STATUS.DRAFT) {
    throw new Error('PurchaseRequest: only DRAFT can be submitted');
  }
  if (!aggregate.items.length) throw new Error('PurchaseRequest: items required');
  return createPurchaseRequestAggregate({
    ...aggregate,
    status: PURCHASE_REQUEST_STATUS.SUBMITTED
  });
}

function approvePurchaseRequest(aggregate) {
  if (![PURCHASE_REQUEST_STATUS.SUBMITTED, PURCHASE_REQUEST_STATUS.UNDER_APPROVAL].includes(aggregate.status)) {
    throw new Error('PurchaseRequest: invalid status for approval');
  }
  return createPurchaseRequestAggregate({
    ...aggregate,
    status: PURCHASE_REQUEST_STATUS.APPROVED
  });
}

module.exports = {
  createPurchaseRequestAggregate,
  submitPurchaseRequest,
  approvePurchaseRequest
};
