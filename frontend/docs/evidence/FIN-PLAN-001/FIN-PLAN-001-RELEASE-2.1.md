# FIN-PLAN-001 — Finance Release 2.1

**Título:** Inteligência económica operacional  
**Risco:** médio · **Classe CONCEPT:** expansão incremental

## Objetivo

Transformar custos operacionais em inteligência económica.

## Capacidades entregues

| ID | Nome |
|----|------|
| `smart_costing` | Smart Costing (Custo Unitário Dinâmico) |
| `economic_performance` | Performance económica |

## Valor de negócio

- Conhecer custo real / unitário por lote, linha ou evento  
- Identificar rentabilidade operacional relativa  
- Priorizar pelo índice de pressão / performance económica  

## Componentes reutilizados

`industrialCostService` · `industrialCostImpactService` · `unifiedCostControlService` · CentroCustosExecutivo · IoT/PLC · sinais Logistics/WMS · `economicPressureIndexEngine` · `operationalEconomicImpactEngine`

## Dependências

- Release **2.0** validado (superfície executiva estável)  
- APIs `/costs/*` e impact service  
- Telemetria / eventos operacionais como drivers  

## Risco

**Médio** — evolução de cost services; proibido engine Smart Costing paralelo.

## Impacto esperado

Decisões de margem operacional com custo dinâmico, sem ERP contábil.

## Readiness

| Critério | Nota |
|----------|------|
| Dependências | industrial costs certificados |
| Contratos | `dashboard.costs` |
| Reutilização | confirmada no FIN-CONCEPT |
| Baseline | impacto baixo se aditivo |

## Proibido

Novo costing engine · GL/ERP · alterar OPM certificado.
