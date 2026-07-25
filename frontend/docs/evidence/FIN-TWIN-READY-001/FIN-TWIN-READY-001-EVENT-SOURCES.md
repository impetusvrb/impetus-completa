# FIN-TWIN-READY-001 — Event Sources

**Fonte:** `eventSources/twinEventSources.js`  
**Somente catálogo** — sem subscriptions nem handlers.

---

## Eventos que poderão actualizar o Twin

| ID | Label | Affects (estado/entidades) | Owner | Status |
|----|-------|----------------------------|-------|--------|
| evt-wms-movement | Movimentação WMS | stock, valuation | wms_inventory | READY |
| evt-cost-upsert | Custo industrial | current/accumulated cost | industrial_cost | READY |
| evt-leakage | Leakage / alerta | losses, risk | financial_leakage | READY |
| evt-energy | Telemetria energia | consumption, drivers | iot_energy | PARTIAL |
| evt-driver-change | Driver/rate config | driver_rate, smart_costing | finance_driver_model | READY |
| evt-asset-update | Activo / link / twin sync | asset, spatial_ref | asset_cost_map / DT | PARTIAL |
| evt-industrial | Parada / produção | signals, impact, cost | MES / impact | PARTIAL |
| evt-economic-engine | Recálculo 2.1 | smart_costing, performance | EconomicIntelligenceEngine | READY |
| evt-billing | Billing/wallet/ledger | billing plane | nexus | READY |
| evt-maintenance | Diagnóstico ManuIA | equipment, risk, orders | manutencao | PARTIAL |

No FIN-EVOLVE-2.2, o Twin deverá **subscrever/compor** estas fontes — não reinventá-las.
