# SUPPLY — Domain Events (GF-023)

**Prefixo:** `supply.`  
**Catálogo:** `events/supplyEventCatalog.js`  
**Factory:** `events/supplyDomainEvents.js`

---

## Eventos mínimos GF-023

| Evento | Emissor |
|--------|---------|
| `supply.request.created` | PurchaseRequestService.submit |
| `supply.request.approved` | PurchaseRequestService.approve |
| `supply.quotation.received` | QuotationEvaluationService.recordQuotation |
| `supply.quotation.selected` | QuotationEvaluationService.selectBest |
| `supply.purchase_order.created` | PurchaseOrderDomainService |
| `supply.contract.signed` | ContractLifecycleService.sign |
| `supply.contract.expired` | ContractLifecycleService.evaluateRenewal |

---

## Handoff WMS (futuro — evento only)

```
supply.purchase_order.created
        ↓ (contrato futuro GF-024+)
wms.receiving.* (execução WMS — não importado GF-023)
```

---

*Testes:* `npm run test:supply-core-domain`
