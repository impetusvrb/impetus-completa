# GF-021 — Supply Ubiquitous Language (Definitivo)

**Identificador:** `GF-021-UBIQUITOUS-LANGUAGE` · **Actualizado:** GF-023  
**Domínio:** Supply · `supply_native`  
**Decisão:** [DEC-001-DOMAIN-SELECTION.md](../evidence/DEC-001-DOMAIN-SELECTION.md)  
**SSOT código:** `backend/src/domains/supply/semantics/supplyCoreSemantics.js`

---

## Glossário oficial (definitivo)

| Termo | Definição | Responsabilidade | Ciclo de vida (resumo) | Sinónimos proibidos |
|-------|-----------|------------------|------------------------|---------------------|
| **Supplier** | Contraparte fornecedora qualificada | SSOT party procurement | PROSPECT → QUALIFIED → ACTIVE → SUSPENDED/DISQUALIFIED | "vendor" UI |
| **PurchaseRequest** | Pedido interno de compra | Agregado raiz requisição | DRAFT → SUBMITTED → UNDER_APPROVAL → APPROVED/REJECTED → CONVERTED_TO_PO | "pedido" genérico |
| **PurchaseOrder** | Ordem de compra emitida | Compromisso procurement pós-aprovação | DRAFT → ISSUED → … → RECEIVED/CLOSED | PO em dados only |
| **Quotation** | Cotação de fornecedor | Avaliação competitiva | REQUESTED → RECEIVED → SELECTED/REJECTED/EXPIRED | "orçamento" vago |
| **Contract** | Contrato fornecedor | Governança compromisso longo prazo | DRAFT → ACTIVE → EXPIRED/TERMINATED | — |
| **Approval** | Decisão formal aprovação | Workflow step | PENDING → APPROVED/REJECTED/ESCALATED | — |
| **Category** | Classificação spend | Agrupamento análise | ACTIVE/INACTIVE | — |
| **Buyer** | Comprador responsável | Actor requisição | ACTIVE/INACTIVE | — |
| **SpendCenter** | Centro de custo compras | Referência orçamental | ACTIVE/INACTIVE | "departamento" |

---

## Agregado PurchaseRequest

```
PurchaseRequest (root)
├── Items (RequestLine[])
├── ApprovalFlow (ApprovalStep[])
├── BudgetReference (SpendCenter + allocated)
└── SupplierSuggestion[]
```

---

## Eventos oficiais (GF-023)

`supply.request.created` · `supply.request.approved` · `supply.quotation.received` · `supply.quotation.selected` · `supply.purchase_order.created` · `supply.contract.signed` · `supply.contract.expired`

---

## Separação Supply × WMS

| Supply (decisão) | WMS (execução) |
|------------------|----------------|
| PurchaseOrder | ReceivingOrder |
| Supplier performance | Receiving / Inventory |
| Contract | Warehouse |

Integração: **eventos e contratos** — sem import OCL/WMS em GF-023.

---

*Referência:* [GF-023-CORE-DOMAIN.md](../evidence/GF-023-CORE-DOMAIN.md)
