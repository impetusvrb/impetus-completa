# FIN-TWIN-READY-001 — State Model

**Fonte:** `stateModel/twinStateModel.js`  
**Contrato declarativo:** `finance.twin_state.v0`  
**Regra:** documentar atributos — **não** calcular novos indicadores.

---

## Atributos do estado financeiro do Twin

| ID | Label | Fontes existentes | Status |
|----|-------|-------------------|--------|
| current_cost | Custo corrente | costs + Smart Costing / costReal | READY |
| accumulated_cost | Custo acumulado | per_month / by-origin | READY |
| losses | Perdas | top-loss + leakage + economic_losses | READY |
| efficiency | Eficiência económica | FIN-EVOLVE-2.1 | READY |
| valuation | Valuation estoque | wms_valuation.v1 | READY |
| consumption | Consumo E/material/volume | drivers + MES/IoT | PARTIAL |
| financial_impact | Impacto financeiro | impact_from_events / projected | PARTIAL |
| operational_risk | Risco operacional $ | alerts + losses compose | PARTIAL |
| cost_by_asset | Custo por activo | Smart Costing byAsset | READY |
| cost_by_line | Custo por linha | Smart Costing byLine | READY |
| cost_by_cost_center | Custo por CC | Smart Costing byCostCenter | READY |
| spatial_ref | Ref. espacial | digital_twin + twin_node_ref | PARTIAL |

## Proibido neste modelo

- new_indicator_calculation  
- twin_runtime  
- simulation / what_if / prediction  

O FIN-EVOLVE-2.2 deve **projectar** estes atributos sobre nós/activos — reutilizando produtores existentes.
