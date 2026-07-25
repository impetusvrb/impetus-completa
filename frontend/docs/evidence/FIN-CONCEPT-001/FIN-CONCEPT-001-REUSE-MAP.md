# FIN-CONCEPT-001 — Reuse Map

Mapa de reutilização plataforma → ideias Finance.

## Plataforma → capacidades

| Componente plataforma | Capacidades beneficiadas |
|----------------------|--------------------------|
| Digital Twin (service + Applied + org + panel) | Financial Digital Twin, PdM financeira, What-if |
| Centro Cognitivo / EOX Finance | Dashboards, KPIs, Twin Financeiro (futuro), alertas |
| IoT / PLC / Edge | Smart Costing, PdM financeira, Twin |
| industrialCost* / unifiedCostControl | Smart Costing, KPIs, Twin, PdM $ |
| financialLeakage* | Alertas, KPIs, Twin, inventário $ (padrões) |
| WMS inventory (OPM) | Optimização financeira de estoque |
| OPM-008 what-if logístico | What-if financeiro (padrão) |
| CPL ScenarioProvider / Recommendation | What-if, alertas, Twin |
| operationalForecasting* | What-if, PdM $, Twin, alertas |
| economic* engines | Performance económica, KPIs |
| dashboardProfiles / Centro Comando | Dashboards por papel, alertas, KPIs |
| chat / ANAM / smartPanel | Análise NL |
| Nexus Billing/Wallet/Ledger | KPIs billing (já no hub) |
| Supply BudgetReference / CAPEX policy | Analogia fraca → CAPEX (ainda greenfield) |

## Anti-padrões a evitar

| Tentação | Porquê evitar |
|----------|----------------|
| Novo “simulador financeiro” | Duplica Twin + CPL + forecasting |
| Novo “costing engine” | Duplica industrialCost* |
| Novo inventário Finance | Viola WMS `maintenance_only` |
| ERP AP/AR agora | Fora de integrate_then_develop Fase A/B |
| CAPEX portfolio agora | Ausente; P3 greenfield |

## Princípio

> Se a capacidade pode ser uma **vista + adapter + contrato** sobre serviços certificados, **não** é módulo novo.
