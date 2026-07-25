# SUPPLY — Domain Model

**Programa:** GF-023  
**Modo:** In-memory · sem persistência

---

## Entidades e agregados

| Tipo | Nome | Root |
|------|------|:----:|
| Entity | Supplier, PurchaseOrder, Quotation, Contract, Approval, Category, Buyer, SpendCenter | — |
| Aggregate | **PurchaseRequest** | YES |

---

## PurchaseRequest Aggregate

| Componente | Tipo | Ficheiro |
|------------|------|----------|
| Items | Value Object `RequestLine[]` | `model/valueObjects.js` |
| ApprovalFlow | `ApprovalStep[]` | policies → aggregate |
| BudgetReference | Value Object | `createBudgetReference` |
| SupplierSuggestion | Value Object[] | `createSupplierSuggestion` |

---

## Value Objects

Money · RequestLine · BudgetReference · SupplierSuggestion · ApprovalStep

---

## Transições (PurchaseRequest)

DRAFT → submit → UNDER_APPROVAL → approve → APPROVED → PO created

---

*SSOT:* `semantics/supplyCoreSemantics.js` · `model/aggregates/purchaseRequestAggregate.js`
