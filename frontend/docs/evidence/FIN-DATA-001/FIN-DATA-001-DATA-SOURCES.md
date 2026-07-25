# FIN-DATA-001 — Data Sources Inventory

**Programa:** FIN-DATA-001  
**Princípio:** DATA BEFORE INTELLIGENCE  
**Fonte:** `financeDataInventory.js`

---

## Resumo

| Status | Qtd | Significado |
|--------|-----|-------------|
| available | 8 | Contrato público usable hoje |
| partial | 11 | Existe, mas incompleto / não wired / sem $ |
| absent | 0 | — |

---

## Inventário

| ID | Nome | Domínio | Status | Qualidade | API / contrato |
|----|------|---------|--------|-----------|----------------|
| industrial_cost_service | Industrial Cost Service | finance_operational | available | high | `dashboard.costs` / `/api/dashboard/costs/*` |
| industrial_cost_impact_service | Cost Impact | finance_operational | partial | medium | interno; sem rota dedicada |
| unified_cost_control | Unified Cost Control | cognitive_runtime | available | high (IA cost) | via decision engine |
| financial_leakage | Financial Leakage | finance_operational | available | high (REG-002) | `/api/dashboard/financial-leakage/*` |
| nexus_billing | Nexus Billing Engine | nexus_ia | available | high | admin nexus-wallet billing-engine |
| nexus_wallet | Nexus Wallet | nexus_ia | available | high | admin nexus-wallet |
| nexus_ledger | Nexus Billing Ledger | nexus_ia | available | high | billing-ledger |
| wms_inventory | WMS Inventory | logistics_wms | partial | qty high; $ absent | WMS inventory module |
| supply_budget | Supply Budget / CAPEX | supply | partial | vestigial CAPEX | supply domain services |
| production_mes | Production / MES | operational | partial | plant-dependent | industrial / edge |
| maintenance_manuia | Maintenance / ManuIA | maintenance | partial | ops strong; ROI $ absent | manutencao-ia digital-twin |
| digital_twin | Digital Twin | integrations_manuia | partial | ops high; no $ layer | integrations + manutencao-ia |
| recommendation_engine | AIOI / Smart Panel | aioi_dashboard | partial | finance intents uncertified | panel-command |
| scenario_engine | CPL Scenario / OPM-008 | logistics_cognitive | partial | logistics only | in-memory ScenarioProvider |
| forecasting | Operational Forecasting | dashboard_previsao | partial | client>live mounts | projections/alerts/health |
| economic_engines | Economic Pressure / Impact | cognitive_runtime_c3 | partial | proxy; erp_integrated false | C3 facade |
| contextual_modules | Contextual Modules | contextual_modules | available | governance | dashboard/me |
| cognitive_center | Centro Cognitivo / EOX | presentation_eox | available | presentation | EOX shells |
| iot_energy | IoT / Energy / Edge | industrial_edge | partial | plant-dependent | edge ingest / PLC |

---

## Frequência de actualização (classes)

| Classe | Fontes |
|--------|--------|
| on_read aggregate | industrial_cost, financial_leakage, forecasting |
| transactional | nexus_wallet / billing / ledger |
| event-driven (quando wired) | cost_impact, telemetry, production |
| interactive | scenario_engine |
| session / UI | contextual_modules, cognitive_center |

---

## Notas de consumo Finance

- **Hub R2.0:** costs + leakage (+ wallet soft-fail).  
- **Não duplicar** industrial cost nem leakage noutro serviço.  
- **WMS / Twin / Energy** são pré-requisitos de dados para 2.1–2.3, não substitutos de custo industrial.
