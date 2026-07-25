# FIN-PLAN-001 — Capability Packages

**Princípio:** DELIVER CAPABILITIES, NOT MODULES  
**Fonte:** FIN-CONCEPT-001 exclusivamente para capacidades

## Pacotes oficiais

| Release | Package ID | Capacidades (FIN-CONCEPT ids) | Novos módulos? |
|---------|------------|-------------------------------|----------------|
| **2.0** | `finance_release_2_0` | role_based_dashboards · executive_financial_kpis · smart_financial_alerts | Não |
| **2.1** | `finance_release_2_1` | smart_costing · economic_performance | Não |
| **2.2** | `finance_release_2_2` | financial_digital_twin · scenario_planning_whatif | Não |
| **2.3** | `finance_release_2_3` | inventory_financial_optimization · predictive_maintenance_financial · natural_language_analysis | Não |
| **Backlog** | `finance_strategic_backlog` | capex_opex_investment · managerial_consolidation | Sim (adiado) |

## Notas de agrupamento

- **Release 2.2** cobre What-if + simulações financeiras como facetas do Twin / ScenarioProvider — sem capability CONCEPT separada “simulador”.
- **Release 2.3** inclui inteligência operacional financeira como composição das três capacidades listadas (Supply/WMS/OPM/IA).

## Cobertura

Todas as **12** capacidades do FIN-CONCEPT-001 estão atribuídas a exactamente um pacote.

## Catálogo

`frontend/src/platform/planning/finance-release/financeCapabilityPackages.js`
