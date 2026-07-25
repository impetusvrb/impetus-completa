'use strict';

function _moneyAmount(value) {
  if (value == null) return null;
  if (typeof value === 'object' && value.amount != null) return Number(value.amount);
  return Number(value);
}

function createMoney(amount, currency = 'BRL') {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) throw new Error('Money: invalid amount');
  return Object.freeze({ amount: n, currency });
}

function createRequestLine({ lineNumber, itemCode, description, quantity, uom, unitPrice }) {
  if (!itemCode || !quantity) throw new Error('RequestLine: itemCode and quantity required');
  const price = _moneyAmount(unitPrice);
  return Object.freeze({
    lineNumber: lineNumber ?? 1,
    itemCode: String(itemCode),
    description: description || '',
    quantity: Number(quantity),
    uom: uom || 'un',
    unitPrice: price != null && Number.isFinite(price) ? createMoney(price) : null,
    extendedAmount: price != null && Number.isFinite(price) ? createMoney(price * Number(quantity)) : null
  });
}

function createBudgetReference({ spendCenterId, budgetCode, allocatedAmount, consumedAmount = 0 }) {
  if (!spendCenterId) throw new Error('BudgetReference: spendCenterId required');
  return Object.freeze({
    spendCenterId,
    budgetCode: budgetCode || null,
    allocatedAmount: createMoney(allocatedAmount ?? 0),
    consumedAmount: createMoney(consumedAmount)
  });
}

function createSupplierSuggestion({ supplierId, score, reason }) {
  return Object.freeze({
    supplierId,
    score: Number(score ?? 0),
    reason: reason || 'policy_rank'
  });
}

function createApprovalStep({ stepOrder, approverRole, status = 'PENDING' }) {
  return Object.freeze({ stepOrder, approverRole, status });
}

module.exports = {
  createMoney,
  createRequestLine,
  createBudgetReference,
  createSupplierSuggestion,
  createApprovalStep
};
