# ENVIRONMENT — Rollout Readiness (Pilot)

Integração:

- `Enterprise Controlled Rollout Engine`
- `environmentPilotReadinessEngine`
- `tenantPilotReadinessEngine`

## Regras

- `auto_promotion: false` sempre
- `shadow_only: true` na Etapa 8
- Decisão assistiva: `REMAIN_IN_SHADOW` | `ADJUST_UX_AND_DENSITY` | `PILOT_TENANT_CANDIDATE` (manual)

## Métricas observabilidade

- `environment_rollout_readiness_score`
- `environment_operational_adoption_score`
- `environment_multi_domain_coexistence_score`
