# Enterprise Contextual UX — Relatório

**Motor:** `EnterpriseContextualUxValidator`

## Classificação de pressão

| Classe | Critério |
|--------|----------|
| LOW | Poucos desvios |
| MODERATE | Desvios moderados |
| HIGH | Múltiplos desvios |
| CRITICAL | Menu/dashboard/abandono críticos |

## Detecções

menu_saturation · excessive_navigation · dashboard_overload · workflow_fatigue · operational_friction · visual_overload

## Decisão

Se `worst_pressure_class` ≥ HIGH → **REDUCE_UX_DENSITY** antes de pilot.
