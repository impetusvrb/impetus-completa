# FIN-PLAN-001 — Dependency Matrix

**Princípio:** Nenhuma duplicação é permitida.

## Por release (união)

| Release | Reuso principal | Domínio proprietário da entrega | Proibido |
|---------|-----------------|----------------------------------|----------|
| 2.0 | EOX, RBAC, CC, recommendations, contextual | finance (apresentação) | engines novas |
| 2.1 | industrialCost*, economics engines, IoT | finance (expansão costs) | costing engine paralelo |
| 2.2 | Twin, CPL Scenario, forecasting, CC | finance (adapter sobre twin) | simulador / twin paralelo |
| 2.3 | Supply, WMS adapters, OPM, IA/ManuIA | finance (composição) | reinventar WMS/OPM |
| Backlog | vestigial Supply only | future finance_native | início prematuro |

## Por capacidade

Ver catálogo canónico: `financeDependencyMatrix.js` (espelha FIN-CONCEPT reusedComponents + dependencies).

## Contratos transversais

- `VIEW_FINANCIAL`  
- `dashboard.costs` / `dashboard.financialLeakage`  
- Finance public contracts (FIN-EVOLVE-001)  
- CPL ScenarioProvider / Recommendation (2.2+)  

## Integrações

Todas as integrações são **consumo** de serviços existentes — zero remount de engines OPM/CPL/EOX.
