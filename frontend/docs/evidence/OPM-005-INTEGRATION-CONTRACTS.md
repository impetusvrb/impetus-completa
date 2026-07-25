# OPM-005 — Integration Contracts

**Fonte:** `shippingIntegrationContracts.js`

---

## Picking (activo)

| Campo | Valor |
|-------|-------|
| relation | fulfillment_handoff |
| apiSurface | GET /v1/picking · POST /v1/picking/:id/complete |
| targetPhase | OPM-004 |

---

## Inventário (activo)

| Campo | Valor |
|-------|-------|
| relation | outbound_stock_movement |
| apiSurface | POST /v1/inventory/movements |
| movementType | issue |
| referenceType | shipping |
| targetPhase | OPM-005 |

---

## Armazéns (activo)

| Campo | Valor |
|-------|-------|
| relation | outbound_dock_locations |
| apiSurface | GET /v1/warehouses/:id/locations |
| targetPhase | OPM-001C |

---

## Transport Management (contrato only)

| Campo | Valor |
|-------|-------|
| relation | carrier_vehicle_assignment |
| apiSurface | GET /transport/shipments |
| targetPhase | OPM-005+ |

---

## Yard Management (contrato only)

| Campo | Valor |
|-------|-------|
| relation | yard_dock_scheduling |
| apiSurface | GET /yard/docks |
| targetPhase | OPM-007+ |

---

## Fluxo outbound completo

```
Picking (completed) → Shipping (create/staged) → Loading → Dispatch
                                                          ↓
                                              Inventory movement (issue)
```

---

## GAPs

Ver `shippingGapRegistry.js` — GAP-OPM-SHP-001 a GAP-OPM-SHP-003.
