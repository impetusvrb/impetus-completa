'use strict';

const foundation = require('./foundationContractService');
const { SupplierQualificationService } = require('./SupplierQualificationService');
const { PurchaseRequestService } = require('./PurchaseRequestService');
const { QuotationEvaluationService } = require('./QuotationEvaluationService');
const { ContractLifecycleService } = require('./ContractLifecycleService');
const { ApprovalPolicyService } = require('./ApprovalPolicyService');
const { SpendAnalysisService } = require('./SpendAnalysisService');
const { PurchaseOrderDomainService } = require('./PurchaseOrderDomainService');
const supplyApi = require('./supplyApiService');

module.exports = {
  ...foundation,
  supplierQualificationService: new SupplierQualificationService(),
  purchaseRequestService: new PurchaseRequestService(),
  purchaseOrderDomainService: new PurchaseOrderDomainService(),
  quotationEvaluationService: new QuotationEvaluationService(),
  contractLifecycleService: new ContractLifecycleService(),
  approvalPolicyService: new ApprovalPolicyService(),
  spendAnalysisService: new SpendAnalysisService(),
  supplyApi
};
