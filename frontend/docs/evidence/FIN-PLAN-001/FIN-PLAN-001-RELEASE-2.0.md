# FIN-PLAN-001 — Finance Release 2.0

**Título:** Visão executiva do Diretor Financeiro  
**Risco:** baixo · **Classe CONCEPT:** reutilização imediata

## Objetivo

Fortalecer a visão executiva do Diretor Financeiro com superfícies já existentes — sem módulos novos.

## Capacidades entregues

| ID | Nome |
|----|------|
| `role_based_dashboards` | Dashboards por papel |
| `executive_financial_kpis` | Indicadores financeiros executivos |
| `smart_financial_alerts` | Alertas financeiros inteligentes |

## Valor de negócio

- Identificar desvios rapidamente  
- Visualizar indicadores por perfil  
- Receber alertas financeiros accionáveis  

## Componentes reutilizados

EOX Finance · RBAC VIEW_FINANCIAL · Centro Comando / OPM-008 patterns · Recommendation Engine · Contextual Modules (`financial_intelligence`) · costs/leakage APIs · ImpetusChart

## Dependências

- FIN-EVOLVE-001 / 001A (hub + identidade)  
- FIN-STAB-001 recomendado antes de arranque  
- `finance_management` profile / VIEW_FINANCIAL  

## Risco

**Baixo** — apenas curadoria, deep-links e composição de alertas/KPIs.

## Impacto esperado

O CFO passa a usar o domínio Finance como cockpit executivo coerente, sem nova engine.

## Readiness (início)

| Critério | Estado planeado |
|----------|-----------------|
| Dependências disponíveis | ✓ pós-STAB |
| Contratos existentes | ✓ |
| Integrações validadas | ✓ (costs/leakage REG-002) |
| Reutilização confirmada | ✓ |
| Impacto Baseline | muito baixo |

## Proibido neste release

Implementar Smart Costing, Twin financeiro, what-if, CAPEX, ou qualquer engine nova.
