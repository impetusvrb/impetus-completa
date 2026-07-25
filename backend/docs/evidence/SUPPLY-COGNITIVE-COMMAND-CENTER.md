# SUPPLY — Cognitive Command Center Foundation

**Programa:** GF-025  
**Estado:** **FOUNDATION** (infra only)  
**Data:** 2026-07-18

---

## Componentes

| Ficheiro | Função |
|----------|--------|
| `cognitive/supplyCommandCenterRegistry.js` | 7 centros GF-021 §6 |
| `cognitive/supplyCommandCenterContracts.js` | Contratos shapes-only |
| `cognitive/supplyCommandCenterRuntime.js` | Foundation descriptor |

---

## Centros registados (GF-021)

| ID | Centro | Blocos registados |
|----|--------|-------------------|
| `supply.center.overview` | Supply Overview | agregação declarativa |
| `supply.center.inbound_exceptions` | Inbound Exceptions | — (futuro OCL) |
| `supply.center.commitments` | Commitments | PO + Contract blocks |
| `supply.center.supplier_performance` | Supplier Performance | supplier_registry |
| `supply.center.procurement_trends` | Procurement Trends | spend_center_budget |
| `supply.center.procurement_actions` | Procurement Actions | approval_workflow |
| `supply.center.requisition_queue` | Requisition Queue | PR + quotation blocks |

---

## Saída foundation

```javascript
buildSupplyCommandCenterFoundation(promotionResult) → {
  status: 'FOUNDATION',
  supply_cognitive_centers: [...],  // com promoted_blocks por centro
  promotion_applied,
  promotion_ratio,
  operational_logic: false,
  ui_business: false,
  read_only: true
}
```

---

## Limites GF-025

- **Sem** UI de negócio
- **Sem** lógica operacional
- **Sem** consolidação Z.23 (GF-026+)
- **Sem** attachment ao `cognitiveRuntimeFacade` (GF-026)

---

*Promotion:* [GF-025-PROMOTION.md](./GF-025-PROMOTION.md)
