# ENVIRONMENT — Pilot Rollout (Etapa 8)

## Objectivo

Validar **maturidade operacional humana** do domínio ambiental em modo **SHADOW** — sem FULL rollout nem auto-promotion.

## Arquitectura

| Camada | Path |
|--------|------|
| Backend pilot | `backend/src/domains/environment/pilot-rollout/` |
| Frontend pilot UX | `frontend/src/domains/environment/pilot-runtime/` |
| API | `POST /api/environment-pilot-rollout/pack` |

## Runtimes principais

- `environmentPilotRolloutRuntime` — pacote consolidado
- `environmentPilotReadinessEngine` — níveis NOT_READY … FULL_READY
- `environmentOperationalMaturityScoring` — INITIAL … ENTERPRISE_READY
- `environmentOperationalErgonomicsRuntime` — validação por perfil
- `environmentCognitiveSaturationRuntime` — pressão cognitiva / saturação
- `environmentMultiDomainValidationRuntime` — coexistência Q/S/L/E

## UI

- `/app/environment/operational?view=pilot`
- `/app/environment/operational?view=rollout`

## Testes

```bash
npm run test:environment-pilot-rollout
```
