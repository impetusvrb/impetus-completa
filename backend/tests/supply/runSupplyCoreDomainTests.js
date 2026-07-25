'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const semantics = require('../../src/domains/supply/semantics/supplyCoreSemantics');
const policies = require('../../src/domains/supply/policies/supplyDomainPolicies');
const aggregates = require('../../src/domains/supply/model/aggregates');
const eventCatalog = require('../../src/domains/supply/events/supplyEventCatalog');
const { isSupplyEvent } = require('../../src/domains/supply/events/supplyEventNamespace');
const integrationContracts = require('../../src/domains/supply/shared/integrationContracts');
const services = require('../../src/domains/supply/services');
const { SUPPLY_CONCEPTUAL_ENTITIES } = require('../../src/domains/supply/core/supplyEntityRegistry');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

function assertNoForbiddenImports() {
  const root = path.join(__dirname, '../../src/domains/supply');
  const forbidden = [
    'require(\'../../../db\'',
    'operationalCompatibilityLayer',
    'logistics-operational',
    'warehouseService',
    'warehouse_',
    'axios',
    'fetch('
  ];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.js')) {
        const c = fs.readFileSync(p, 'utf8');
        for (const token of forbidden) {
          assert.ok(!c.includes(token), `${path.relative(root, p)}: forbidden ${token}`);
        }
      }
    }
  };
  walk(root);
}

(async () => {
  console.log('GF-023 — Supply Core Domain Tests\n');

  test('ubiquitous language: 9 entity types', () => {
    assert.strictEqual(SUPPLY_CONCEPTUAL_ENTITIES.length, 9);
    assert.strictEqual(semantics.SUPPLY_ENTITY_TYPES.length, 9);
  });

  test('semantics: lifecycle statuses valid', () => {
    assert.ok(semantics.isValidStatus('PurchaseRequest', 'DRAFT'));
    assert.ok(semantics.isValidStatus('Contract', 'ACTIVE'));
    assert.ok(!semantics.isValidStatus('PurchaseRequest', 'INVALID'));
  });

  test('PurchaseRequest aggregate: items + budget + approval', () => {
    const agg = aggregates.purchaseRequest.createPurchaseRequestAggregate({
      id: 'req-1',
      requestNumber: 'REQ-001',
      items: [{ itemCode: 'MAT-1', quantity: 10, unitPrice: 100 }],
      budgetReference: { spendCenterId: 'SC-1', allocatedAmount: 5000, consumedAmount: 0 }
    });
    assert.strictEqual(agg.items.length, 1);
    assert.strictEqual(agg.totalAmount.amount, 1000);
    assert.ok(agg.budgetReference);
  });

  test('policies: approvalPolicy deterministic', () => {
    const low = policies.approvalPolicy({ amount: 5000 });
    const high = policies.approvalPolicy({ amount: 60000 });
    assert.strictEqual(low.steps.length, 1);
    assert.ok(high.steps.length >= 3);
  });

  test('policies: quotationSelectionPolicy lowest cost', () => {
    const sel = policies.quotationSelectionPolicy([
      { id: 'q1', status: 'RECEIVED', totalAmount: { amount: 200 }, supplierScore: 80 },
      { id: 'q2', status: 'RECEIVED', totalAmount: { amount: 150 }, supplierScore: 70 }
    ]);
    assert.strictEqual(sel.selected.id, 'q2');
  });

  test('policies: budgetCompliancePolicy', () => {
    const ok = policies.budgetCompliancePolicy(
      { allocatedAmount: { amount: 1000 }, consumedAmount: { amount: 200 } },
      { amount: 500 }
    );
    assert.strictEqual(ok.compliant, true);
  });

  test('SupplierQualificationService', () => {
    const ranked = services.supplierQualificationService.rankSuppliers([
      { id: 's1', qualificationScore: 90, status: 'PROSPECT' },
      { id: 's2', qualificationScore: 70, status: 'PROSPECT' }
    ]);
    assert.strictEqual(ranked[0].id, 's1');
  });

  test('PurchaseRequestService submit + approve emits events', () => {
    const draft = services.purchaseRequestService.createDraft({
      requestNumber: 'REQ-100',
      items: [{ itemCode: 'X', quantity: 2, unitPrice: 50 }],
      budgetReference: { spendCenterId: 'SC-1', allocatedAmount: 1000 }
    });
    const { aggregate: submitted, event: createdEv } = services.purchaseRequestService.submit(draft);
    assert.strictEqual(createdEv.type, 'supply.request.created');
    const { aggregate: approved, event: approvedEv } = services.purchaseRequestService.approve(submitted);
    assert.strictEqual(approvedEv.type, 'supply.request.approved');
    assert.strictEqual(approved.status, 'APPROVED');
  });

  test('QuotationEvaluationService select', () => {
    const { quotation } = services.quotationEvaluationService.recordQuotation({
      id: 'q-1',
      supplierId: 'sup-1',
      totalAmount: 100
    });
    assert.strictEqual(quotation.status, 'RECEIVED');
    const { event } = services.quotationEvaluationService.selectBest([quotation]);
    assert.strictEqual(event.type, 'supply.quotation.selected');
  });

  test('ContractLifecycleService sign + expire', () => {
    const { event: signedEv } = services.contractLifecycleService.sign({
      id: 'c-1',
      status: 'PENDING_SIGNATURE',
      validTo: '2030-01-01'
    });
    assert.strictEqual(signedEv.type, 'supply.contract.signed');
    const { event: expEv } = services.contractLifecycleService.evaluateRenewal(
      { id: 'c-2', status: 'ACTIVE', validTo: '2020-01-01' },
      { now: new Date('2026-01-01') }
    );
    assert.strictEqual(expEv.type, 'supply.contract.expired');
  });

  test('PurchaseOrder from approved request', () => {
    const draft = services.purchaseRequestService.createDraft({
      requestNumber: 'REQ-PO',
      items: [{ itemCode: 'A', quantity: 1, unitPrice: 10 }],
      budgetReference: { spendCenterId: 'SC-1', allocatedAmount: 100 }
    });
    const { aggregate: submitted } = services.purchaseRequestService.submit(draft);
    const { aggregate: approved } = services.purchaseRequestService.approve(submitted);
    const { event } = services.purchaseOrderDomainService.createFromApprovedRequest(approved, {
      supplierId: 'SUP-1'
    });
    assert.strictEqual(event.type, 'supply.purchase_order.created');
  });

  test('GF-023 minimum events in catalog', () => {
    const types = eventCatalog.map((e) => e.type);
    for (const t of [
      'supply.request.created',
      'supply.request.approved',
      'supply.quotation.received',
      'supply.quotation.selected',
      'supply.purchase_order.created',
      'supply.contract.signed',
      'supply.contract.expired'
    ]) {
      assert.ok(types.includes(t), `missing ${t}`);
      assert.ok(isSupplyEvent(t));
    }
  });

  test('WMS integration declarative — conceptual flow only', () => {
    assert.strictEqual(integrationContracts.logistics_wms.active, false);
    assert.ok(integrationContracts.PROCURE_TO_PAY_WMS_FLOW.length >= 4);
    assert.strictEqual(integrationContracts.PROCURE_TO_PAY_WMS_FLOW[0].wms, 'ReceivingOrder');
  });

  test('SpendAnalysisService aggregate', () => {
    const rows = services.spendAnalysisService.aggregateByCategory([
      { categoryId: 'CAT-A', totalAmount: { amount: 100 } },
      { categoryId: 'CAT-A', totalAmount: { amount: 50 } }
    ]);
    assert.strictEqual(rows[0].spend.amount, 150);
  });

  test('forbidden: no DB, OCL, warehouse, HTTP imports', () => {
    assertNoForbiddenImports();
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
