# FIN-EVOLVE-2.3 — Supported variables

**Fonte:** `whatIfVariables.js` + `applyHypotheses.js`

| ID | Alvo |
|----|------|
| `energy_cost` | byOrigin energia + opcional rate drv-energy |
| `cost_driver` | `drivers[metric]` |
| `financial_rate` | `plantRateProvider(mapping_id)` |
| `inventory_valuation` | `valuationSeed.metadata` |
| `production_volume` | `drivers.units_produced` |
| `leakage` | `projectedImpact` / alertas |
| `asset_utilization` | `drivers.utilization_ratio` |

Todas as aplicações são rastreáveis em `hypothesesApplied` e ligadas a contratos oficiais.
