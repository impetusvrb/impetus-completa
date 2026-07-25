'use strict';

const { PURCHASE_ORDER_STATUS, PURCHASE_REQUEST_STATUS } = require('../semantics/supplyCoreSemantics');
const { createDomainEvent } = require('../events/supplyDomainEvents');

class PurchaseOrderDomainService {
  createFromApprovedRequest(request, { supplierId, orderNumber }) {
    if (request.status !== PURCHASE_REQUEST_STATUS.APPROVED) {
      throw new Error('PurchaseOrder: request must be APPROVED');
    }
    if (!supplierId) throw new Error('PurchaseOrder: supplierId required');
    const po = Object.freeze({
      id: null,
      orderNumber: orderNumber || `PO-${request.requestNumber}`,
      supplierId,
      requestId: request.id,
      status: PURCHASE_ORDER_STATUS.DRAFT,
      totalAmount: request.totalAmount,
      companyId: request.companyId
    });
    return {
      purchaseOrder: po,
      event: createDomainEvent('supply.purchase_order.created', {
        orderNumber: po.orderNumber,
        supplierId: po.supplierId
      })
    };
  }
}

module.exports = { PurchaseOrderDomainService };
