# FIN-EVOLVE-2.2 — Twin Overlay

**Módulo:** `domains/finance/twin/overlay/financialTwinOverlay.js`

---

## Função

`composeFinancialTwinOverlay(economicSnapshot)` projecta atributos financeiros em cada link de `finance.asset_cost_map.v1`:

- custo corrente / acumulado  
- valuation  
- perdas / eficiência / impacto  
- custo por activo / linha / CC  
- risco operacional (compose de alertas — GAP-TWIN-004)

## Contratos

`asset_cost_map.v1` · `driver_rate.v1` · `wms_valuation.v1` · EconomicIntelligenceEngine · costs/leakage

`parallelTwin: false` — obrigatório.
