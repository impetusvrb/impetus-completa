# OPM-GOV-001 — Observability Baseline

## Domínios

| Módulo | Prefixo | Eventos | Produtor |
|--------|---------|---------|----------|
| Receiving | `RECEIVING_` | 10 | receivingObservability.js |
| Inventory | `INVENTORY_` | 7 | inventoryObservability.js |
| Picking | `PICKING_` | 11 | pickingObservability.js |
| Shipping | `SHIPPING_` | 10 | shippingObservability.js |

## Eventos obrigatórios (happy path E2E)

- `RECEIVING_COMPLETED`
- `PICKING_STARTED`
- `PICKING_COMPLETED`
- `SHIPPING_LOADING_STARTED`
- `SHIPPING_DISPATCHED`

## Consumidor

- `wmsUiObservability.js` (buffer in-memory)
- CustomEvents DOM: `impetus:receiving`, `impetus:inventory`, `impetus:picking`, `impetus:shipping`

## Invariante

Cada mudança operacional certificada produz evento correspondente (`INV-OBS-001`).

Catálogo completo: `opmGov001ObservabilityContracts.js`
