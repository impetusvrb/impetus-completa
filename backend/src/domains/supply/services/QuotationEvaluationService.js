'use strict';

const { quotationSelectionPolicy } = require('../policies/supplyDomainPolicies');
const { createDomainEvent } = require('../events/supplyDomainEvents');
const { createMoney } = require('../model/valueObjects');

class QuotationEvaluationService {
  recordQuotation(input) {
    const quotation = Object.freeze({
      id: input.id,
      supplierId: input.supplierId,
      requestId: input.requestId,
      status: 'RECEIVED',
      totalAmount: createMoney(input.totalAmount ?? 0),
      supplierScore: input.supplierScore ?? 0,
      validUntil: input.validUntil || null
    });
    return {
      quotation,
      event: createDomainEvent('supply.quotation.received', { quotationId: quotation.id, supplierId: quotation.supplierId })
    };
  }

  selectBest(quotations = []) {
    const result = quotationSelectionPolicy(quotations);
    if (!result.selected) return { selected: null, event: null };
    return {
      selected: { ...result.selected, status: 'SELECTED' },
      event: createDomainEvent('supply.quotation.selected', {
        quotationId: result.selected.id,
        reason: result.reason
      })
    };
  }
}

module.exports = { QuotationEvaluationService };
