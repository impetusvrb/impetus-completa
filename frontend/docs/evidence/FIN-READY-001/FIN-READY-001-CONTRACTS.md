# FIN-READY-001 — Contracts Catalog

**Fonte:** `contracts/financeReadyContracts.js`

---

## Contratos publicados

| ID | Versão | Fecha gap | Owner |
|----|--------|-----------|-------|
| `finance.driver_rate.v1` | 1.0.0 | GAP-FD-011 | finance_driver_model |
| `finance.asset_cost_map.v1` | 1.0.0 | GAP-FD-004 | finance_asset_cost_map |
| `finance.wms_valuation.v1` | 1.0.0 | GAP-FD-003 | finance_wms_valuation |

---

## Ownership certificado

| Informação | Owner | Não possui |
|------------|-------|------------|
| Driver→Rate (estrutura) | finance_driver_model | telemetria, cálculo runtime |
| Cost↔Asset link | finance_asset_cost_map | twin layout, cost items |
| Valuation adapter | finance_wms_valuation | qty WMS |
| Custo industrial | industrial_cost_service | (inalterado) |
| Estoque qty | wms_inventory | (inalterado) |

Duplicação proibida em todas as linhas.

---

## Consumo futuro

| Release | Contratos |
|---------|-----------|
| 2.1 Smart Costing | driver_rate + wms_valuation (+ industrial_cost) |
| 2.2 Financial Twin | asset_cost_map + industrial_cost + leakage |
| 2.3 Estoque financeiro | wms_valuation (produto) |

Nenhum destes releases é implementado em READY-001.
