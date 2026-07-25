# FIN-PLAN-001 — Finance Release 2.2

**Título:** Financial Digital Twin & cenários  
**Risco:** médio-alto · **Classe CONCEPT:** expansão incremental

## Objetivo

Transformar o Digital Twin existente em apoio financeiro à decisão (projeções + what-if + simulações).

## Capacidades entregues

| ID | Nome | Nota |
|----|------|------|
| `financial_digital_twin` | Financial Digital Twin | Backbone estratégico |
| `scenario_planning_whatif` | Planejamento de Cenários (What-if) | Inclui simulações financeiras como overlay |

## Valor de negócio

- Simular cenários antes de executar decisões  
- Ver projeções $ sobre o estado do twin  
- Comparar hipóteses sem side-effects  

## Reutilização obrigatória

Digital Twin existente · CPL ScenarioProvider · OPM-008 what-if pattern · forecasting · Recommendation Engine · Centro Cognitivo · costs/leakage

## Dependências

- Release **2.1** (drivers de custo estáveis recomendados)  
- Twin Applied / org twin / DigitalTwinPanel  
- CPL contracts  

## Risco

**Médio-alto** — integração cross-domínio; tentação de “simulador novo” deve ser rejeitada.

## Impacto esperado

Cockpit espacial de decisão financeira sobre a planta digital — diferencial competitivo.

## Readiness

| Critério | Nota |
|----------|------|
| Twin core | existe (não alterar) |
| Scenario engine | CPL / OPM-008 |
| Proibido | `new_financial_simulator`, `parallel_twin_engine` |

## Proibido (explícito)

Criar simulador financeiro paralelo · duplicar twin · greenfield de scenario engine.
