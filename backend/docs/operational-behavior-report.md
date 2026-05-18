# Operational Behavior — Relatório (Shadow Cycle)

**Motores:** `enterpriseOperationalUsageCollector` · `operationalNavigationHeatmap` · `operationalFlowStabilityEngine` · `operationalFrictionAnalyzer`

## Métricas

| Métrica | Descrição |
|---------|-----------|
| abandono | `route_abandonment_rate` |
| repetição | `repetitive_actions_total` |
| loops | `navigation_loops` |
| tempo operacional | `avg_operational_ms` |
| menus ignorados | `ignored_menu_hits` |
| heatmap | top routes por domínio |

## Segmentação

operador · técnico · supervisor · coordenador · gerente · diretor · auditor

## Ingestão

`POST /api/enterprise-shadow-stabilization/usage/event`
