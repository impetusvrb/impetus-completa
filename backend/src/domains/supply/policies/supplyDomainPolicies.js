'use strict';

/**
 * GF-023 — Políticas determinísticas do domínio Supply.
 */

const { PURCHASE_REQUEST_STATUS, SUPPLIER_STATUS } = require('../semantics/supplyCoreSemantics');

function approvalPolicy({ amount, approvalLimit = 10000, requiresDualApprovalAbove = 50000 }) {
  const steps = [{ stepOrder: 1, approverRole: 'buyer_supervisor', status: 'PENDING' }];
  if (amount > approvalLimit) {
    steps.push({ stepOrder: 2, approverRole: 'procurement_manager', status: 'PENDING' });
  }
  if (amount > requiresDualApprovalAbove) {
    steps.push({ stepOrder: 3, approverRole: 'finance_controller', status: 'PENDING' });
  }
  return Object.freeze({ steps: Object.freeze(steps), deterministic: true });
}

function quotationSelectionPolicy(quotations = []) {
  const eligible = quotations.filter((q) => q.status === 'RECEIVED' && q.totalAmount != null);
  if (!eligible.length) return { selected: null, reason: 'no_eligible_quotations' };
  const sorted = [...eligible].sort((a, b) => {
    if (a.totalAmount.amount !== b.totalAmount.amount) return a.totalAmount.amount - b.totalAmount.amount;
    return (b.supplierScore ?? 0) - (a.supplierScore ?? 0);
  });
  return Object.freeze({ selected: sorted[0], reason: 'lowest_cost_preferred_score_tiebreak', deterministic: true });
}

function supplierEligibilityPolicy(supplier, { minScore = 60 } = {}) {
  if (!supplier) return { eligible: false, reason: 'missing_supplier' };
  if (supplier.status === SUPPLIER_STATUS.DISQUALIFIED || supplier.status === SUPPLIER_STATUS.SUSPENDED) {
    return { eligible: false, reason: 'supplier_blocked' };
  }
  const score = supplier.qualificationScore ?? 0;
  if (score < minScore) return { eligible: false, reason: 'score_below_threshold' };
  return { eligible: true, reason: 'qualified', deterministic: true };
}

function budgetCompliancePolicy(budgetReference, requestTotal) {
  if (!budgetReference) return { compliant: true, reason: 'no_budget_required', deterministic: true };
  const available = budgetReference.allocatedAmount.amount - budgetReference.consumedAmount.amount;
  const compliant = requestTotal.amount <= available;
  return Object.freeze({
    compliant,
    available: available,
    requested: requestTotal.amount,
    reason: compliant ? 'within_budget' : 'exceeds_budget',
    deterministic: true
  });
}

function contractRenewalPolicy(contract, { warnDaysBefore = 30, now = new Date() } = {}) {
  if (!contract?.validTo) return { action: 'none', reason: 'open_ended' };
  const end = new Date(contract.validTo);
  const ms = end - now;
  const days = ms / (86400000);
  if (days < 0) return { action: 'expire', reason: 'past_valid_to', deterministic: true };
  if (days <= warnDaysBefore) return { action: 'renewal_warning', daysRemaining: Math.floor(days), deterministic: true };
  return { action: 'none', reason: 'active', deterministic: true };
}

module.exports = {
  approvalPolicy,
  quotationSelectionPolicy,
  supplierEligibilityPolicy,
  budgetCompliancePolicy,
  contractRenewalPolicy
};
