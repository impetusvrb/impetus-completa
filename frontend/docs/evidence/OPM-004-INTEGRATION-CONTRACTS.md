# OPM-004 — Integration Contracts

**Fonte:** `pickingIntegrationContracts.js`

---

## Inventário (activo)

| Campo | Valor |
|-------|-------|
| relation | inbound_stock_movement (pick) |
| apiSurface | POST /v1/inventory/movements |
| movementType | pick |
| referenceType | picking |
| targetPhase | OPM-004 |

---

## Shipping (contrato only → OPM-005)

| Campo | Valor |
|-------|-------|
| relation | outbound_fulfillment_handoff |
| apiSurface | POST /v1/shipping |
| targetPhase | OPM-005 |

---

## Armazéns (activo)

| Campo | Valor |
|-------|-------|
| relation | pick_locations_routes |
| apiSurface | GET /v1/warehouses/:id/locations |
| targetPhase | OPM-001C |

---

## Recebimento (contrato only)

| Campo | Valor |
|-------|-------|
| relation | inbound_to_pick_demand |
| apiSurface | GET /v1/receiving |
| targetPhase | OPM-003 |

---

## GAPs

Ver `pickingGapRegistry.js` — metadata PATCH, reserva explícita, optimização IA.
