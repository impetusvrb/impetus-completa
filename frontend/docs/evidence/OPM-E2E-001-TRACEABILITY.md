# OPM-E2E-001 — Traceability Matrix

**Data:** 2026-07-19

---

## Requisito → Módulo → Validação

| Requisito | Módulo | Validação automatizada |
|-----------|--------|------------------------|
| ASN → Receiving | OPM-003 | `buildReceivingRows` + `resolveReceivingOperationalStatus` |
| Inventory Receipt | OPM-002A | `movement_type: receipt` + `buildInventoryTimeline` |
| Warehouse Location | OPM-001C | `warehouse_id` + metadata doca |
| Picking | OPM-004 | `resolvePickingOperationalStatus` + movement pick |
| Inventory Pick | OPM-002A | `movement_type: pick` |
| Shipping | OPM-005 | `resolveShippingOperationalStatus` + handoff picking |
| Inventory Issue | OPM-002A | `movement_type: issue` |
| Completed | E2E | `assertFinalStates` |

---

## Contratos de integração

| Ligação | Contrato | movementType | Status |
|---------|----------|--------------|--------|
| Receiving → Inventory | `RECEIVING_INTEGRATION_CONTRACTS.inventory` | `receipt` | active |
| Inventory → Picking | `PICKING_INTEGRATION_CONTRACTS.inventory` | `pick` | active |
| Picking → Shipping | `SHIPPING_INTEGRATION_CONTRACTS.picking` | — | active |
| Shipping → Inventory | `SHIPPING_INTEGRATION_CONTRACTS.inventory` | `issue` | active |

---

## Cenários → Cobertura

| Cenário | Estados | Movimentos | Timeline | Observabilidade |
|---------|---------|------------|----------|-----------------|
| Happy Path | ✅ | ✅ | ✅ | ✅ |
| Receiving Divergence | ✅ | ✅ | ✅ | `RECEIVING_DIVERGENCE` |
| Picking Shortage | ✅ | ✅ | ✅ | `PICKING_DIVERGENCE` |
| Shipping Divergence | ✅ | ✅ | ✅ | `SHIPPING_DIVERGENCE` |

---

## EOX rastreabilidade

| Segmento | Path | Phase |
|----------|------|-------|
| Receiving | `/app/logistics/receiving` | OPM-003 |
| Inventory | `/app/logistics/inventory` | OPM-002A |
| Picking | `/app/logistics/picking` | OPM-004 |
| Shipping | `/app/logistics/shipping` | OPM-005 |

---

## Fonte programática

Matriz exportada em `frontend/src/tests/opm-e2e/opmE2e001Traceability.js` (`E2E_TRACEABILITY_MATRIX`).
