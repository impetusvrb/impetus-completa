# FIN-EVOLVE-2.1 — Smart Costing

**Módulo:** `domains/finance/smart-costing/smartCosting.js`  
**Calculators:** `calculators/driverCostCalculator.js`, `smartCostingCalculators.js`

---

## Cálculos (todos explicáveis)

| Capacidade | Fórmula / origem | Contrato |
|------------|------------------|----------|
| Custo unitário dinâmico | `per_day / units_produced` (ou Σ drivers / volume) | costs + driver_rate |
| Custo por lote | valuation adapter `lot_cost` / `economic_value` | wms_valuation.v1 |
| Custo por activo | Σ contributions linked via asset_cost_map | asset_cost_map.v1 |
| Custo por linha | rollup `line_id` | asset_cost_map.v1 |
| Custo por centro de custo | rollup `cost_center_id` | asset_cost_map.v1 |

Cada resultado inclui `evidence.formula` + `trace[]`.

## Rate resolution (extensível)

1. `mapping.rate_value`  
2. `plantRateProvider` (GAP-FD-005)  
3. match `cost_origin_ref` ↔ `by-origin` (dashboard.costs)  
4. unresolved (trace explícito)
