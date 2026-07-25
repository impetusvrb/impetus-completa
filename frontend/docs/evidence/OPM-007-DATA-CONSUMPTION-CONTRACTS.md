# OPM-007 — Data Consumption Contracts

**Fase:** OPM-007  
**Modo:** read_only  
**Fonte canónica:** `wiDataConsumptionContracts.js`

---

## Princípio

Warehouse Intelligence **consome** dados dos módulos certificados sem alterar handoffs OPM-GOV-001.

---

## Contratos activos

### Inventory (OPM-002A)

| Campo | Valor |
|-------|-------|
| API | `GET /v1/inventory/balances` · `GET /v1/inventory/movements` |
| Uso | KPIs ocupação, heatmaps bins, timeline movimentos |
| Mutação | **Proibida** |

### Receiving (OPM-003)

| Campo | Valor |
|-------|-------|
| API | `GET /v1/receiving` |
| Uso | Gargalos inbound, flow stage 1, timeline |
| Mutação | **Proibida** |

### Picking (OPM-004)

| Campo | Valor |
|-------|-------|
| API | `GET /v1/picking` |
| Uso | Gargalos separação, performance operador, flow |
| Mutação | **Proibida** |

### Shipping (OPM-005)

| Campo | Valor |
|-------|-------|
| API | `GET /v1/shipping` |
| Uso | Gargalos expedição, flow stage final |
| Mutação | **Proibida** |

### Transfer (OPM-006)

| Campo | Valor |
|-------|-------|
| API | `GET /v1/transfers` |
| Uso | Gargalos internos, replenishment/cross-dock metrics |
| Mutação | **Proibida** |

### Warehouses (OPM-001C)

| Campo | Valor |
|-------|-------|
| API | `GET /v1/warehouses` · `GET /v1/warehouses/:id/capacity` |
| Uso | Capacity analytics, filtros timeline |
| Mutação | **Proibida** |

---

## Rastreabilidade recomendações

Cada recomendação inclui objeto `trace` com:

- `source` — utilitário ou endpoint WMS-003
- Métricas derivadas (ex.: `occupancy_pct`, `pending`, `count`)

Exemplo: `wiRecommendationUtils.js` → `trace: { source: 'GET /v1/transfers', pending: N }`

---

## Integração cross-module (declarativa)

| Origem | Relação | Status pós-OPM-007 |
|--------|---------|-------------------|
| `inventoryIntegrationContracts.warehouseIntelligence` | operational_signals | **active** |
| `transferIntegrationContracts.warehouseIntelligence` | internal_movement_signals | contract_only (consumidor activo) |

Handoffs E2E (`receipt` → `pick` → `issue`) permanecem exclusivos dos módulos operacionais.
