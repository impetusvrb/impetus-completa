'use strict';

const { supplierEligibilityPolicy } = require('../policies/supplyDomainPolicies');
const { SUPPLIER_STATUS } = require('../semantics/supplyCoreSemantics');

class SupplierQualificationService {
  qualify(supplier, context = {}) {
    const check = supplierEligibilityPolicy(supplier, context);
    if (!check.eligible) {
      return { ...supplier, status: SUPPLIER_STATUS.SUSPENDED, qualificationNote: check.reason };
    }
    return { ...supplier, status: SUPPLIER_STATUS.QUALIFIED, qualificationNote: check.reason };
  }

  rankSuppliers(suppliers = []) {
    return [...suppliers].sort((a, b) => (b.qualificationScore ?? 0) - (a.qualificationScore ?? 0));
  }
}

module.exports = { SupplierQualificationService };
