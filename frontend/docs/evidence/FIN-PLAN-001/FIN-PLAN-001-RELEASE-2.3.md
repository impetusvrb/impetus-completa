# FIN-PLAN-001 — Finance Release 2.3

**Título:** Operação ↔ Finanças  
**Risco:** médio · **Classe CONCEPT:** expansão incremental

## Objetivo

Conectar operação e finanças numa capacidade completa de decisão cruzada.

## Capacidades entregues

| ID | Nome |
|----|------|
| `inventory_financial_optimization` | Otimização Financeira de Estoque |
| `predictive_maintenance_financial` | Manutenção Preditiva Financeira |
| `natural_language_analysis` | Análise em linguagem natural |

**Composição:** Inteligência Operacional Financeira = correlação das três capacidades acima com Supply/WMS/OPM/IA — não é módulo CONCEPT separado.

## Valor de negócio

- Optimizar estoque sob ótica financeira  
- Decidir manutenção pelo impacto económico  
- Consultar custos/leakage/projeções em linguagem natural  

## Reutilização obrigatória

Supply · WMS inventory (**adapters only** — WMS `maintenance_only`) · OPM · ManuIA/Twin · chat/smartPanel/ANAM · agentes cognitivos

## Dependências

- Releases **2.0–2.2** (visão, custo, twin/cenários)  
- Inventário WMS certificado intocável no core  
- Contratos Finance públicos (FIN-EVOLVE-001)  

## Risco

**Médio** — adapters cross-domínio; risco de violar WMS/OPM se mal scoped.

## Impacto esperado

Loop fechado operação → $ → acção, com NL como canal executivo.

## Proibido

Reimplementar inventário · novo motor NL financeiro · alterar OPM/WMS certificados.
