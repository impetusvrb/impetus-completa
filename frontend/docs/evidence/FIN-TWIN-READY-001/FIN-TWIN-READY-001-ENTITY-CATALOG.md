# FIN-TWIN-READY-001 — Entity Catalog

**Fonte:** `entityCatalog/twinEntityCatalog.js`

---

## Catálogo único

| ID | Label | Owner | Contrato | Status |
|----|-------|-------|----------|--------|
| asset | Activo industrial | digital_twin / asset_cost_map | asset_cost_map.v1 | READY |
| cost_center | Centro de custo | asset_cost_map / costs | asset_cost_map · costs | READY |
| production_line | Linha de produção | asset_cost_map / MES | line_id | READY |
| equipment | Equipamento | twin / ManuIA | asset map | PARTIAL |
| work_order | Ordem | MES / ManuIA | operational | PARTIAL |
| inventory_stock | Estoque qty | wms_inventory | WMS | READY |
| inventory_valuation | Valuation $ | finance_wms_valuation | wms_valuation.v1 | READY |
| industrial_cost | Custo industrial | industrialCostService | dashboard.costs | READY |
| cost_loss | Perdas de custo | industrialCostService | top-loss / projected | READY |
| energy_consumption | Energia | iot_energy | driver_rate drv-energy | PARTIAL |
| financial_leakage | Leakage | financialLeakage | financialLeakage | READY |
| economic_performance | Performance | EconomicIntelligenceEngine | FIN-EVOLVE-2.1 | READY |
| smart_costing | Smart Costing | EconomicIntelligenceEngine | FIN-EVOLVE-2.1 | READY |
| driver_rate | Driver→Rate | finance_driver_model | driver_rate.v1 | READY |
| billing | Billing | nexus_billing | nexus admin | READY |
| wallet | Wallet | nexus_wallet | nexus admin | PARTIAL |
| ledger | Ledger | nexus_ledger | billing-ledger | READY |
| operational_twin_node | Nó twin ops | digital_twin | integrations DT | PARTIAL |
| production_signal | Sinais MES | production_mes | industrial / edge | PARTIAL |

**BLOCKED:** nenhum
