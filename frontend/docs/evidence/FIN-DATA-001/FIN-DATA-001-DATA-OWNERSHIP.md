# FIN-DATA-001 — Data Ownership Matrix

**Programa:** FIN-DATA-001  
**Regra:** **um dono por classe de informação** — duplicação proibida  
**Fonte:** `financeDataOwnership.js`

---

## Matriz

| Informação | Dono (source id) | Domínio | Consumidores |
|------------|------------------|---------|--------------|
| Custo Industrial / operacional | industrial_cost_service | finance_operational | Hub KPIs, CentroCustos, widgets CC |
| Impacto de eventos em custo | industrial_cost_service | finance_operational | executive-summary.impact_from_events |
| Leakage / perdas financeiras operacionais | financial_leakage | finance_operational | Alertas hub, MapaVazamento, CC |
| Billing / créditos plataforma | nexus_billing | nexus_ia | Módulo billing Finance, NexusIACustos |
| Wallet | nexus_wallet | nexus_ia | admin, hub billing_status |
| Ledger (créditos) | nexus_ledger | nexus_ia | billing-ledger UI |
| Estoque (quantidade) | wms_inventory | logistics_wms | WMS; futuro adapter $ Finance |
| Produção / máquina | production_mes | operational | industrial map, twin, drivers |
| Energia / telemetria | iot_energy | industrial_edge | Smart Costing readiness |
| Manutenção / diagnóstico | maintenance_manuia | maintenance | PdM financeira readiness |
| Digital Twin state | digital_twin | integrations_manuia | Financial Twin readiness |
| Forecast / health operacional | forecasting | dashboard_previsao | CentroPrevisao, R2.2 |
| Cenários what-if logísticos | scenario_engine | logistics_cognitive | R2.2 financial overlay |
| Pressão / impacto económico proxy | economic_engines | cognitive_runtime_c3 | R2.1 performance económica |
| Budget / CAPEX vestigial | supply_budget | supply | backlog CAPEX only |

---

## Política anti-duplicação

1. **Não** criar segundo “cost service” no domínio Finance.  
2. Valuation de stock = **adapter Finance** que consome WMS qty — WMS permanece dono da quantidade.  
3. Overlay Twin $ = compose sobre `digital_twin` + `industrial_cost_service` — sem fork do twin.  
4. Billing plataforma ≠ contabilidade industrial — owners Nexus permanecem para créditos.

---

## Validação

`validateFinanceDataOwnership()` exige `duplicationForbidden: true` e owner presente no inventário.
