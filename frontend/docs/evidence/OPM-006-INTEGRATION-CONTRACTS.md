# OPM-006 — Integration Contracts

**Fonte:** `transferIntegrationContracts.js`

---

## Inventário (activo)

| Campo | Valor |
|-------|-------|
| relation | internal_location_movement |
| movementType | transfer |
| invariant | Nunca gera receipt, pick ou issue |

---

## Armazéns (activo)

| Campo | Valor |
|-------|-------|
| relation | origin_destination_locations |
| apiSurface | GET /v1/warehouses/:id/locations |

---

## Receiving / Picking / Shipping (contract_only)

Contratos preparados para cross-dock e replenishment **sem alterar handoffs OPM-GOV-001**.

---

## Warehouse Intelligence (contract_only → OPM-007)

---

## Princípio

`TRANSFER_LAYER_PRINCIPLE` — camada transversal, não fluxo de negócio.
