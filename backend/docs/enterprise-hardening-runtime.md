# Enterprise Operational Hardening Runtime

## Objetivo

Consolidar maturidade operacional enterprise do ecossistema IMPETUS (QUALITY · SAFETY · LOGISTICS · ENVIRONMENT) sem novos domínios, sem FULL rollout automático e sem enforcement.

## Local canónico

- Backend: `backend/src/enterprise-hardening/`
- API: `POST /api/enterprise-hardening/pack` (auth + empresa ativa)
- Frontend: `frontend/src/enterprise-hardening/`
- UI: `/app/environment/operational?view=hardening`

## Orquestrador

`enterpriseOperationalHardeningRuntime` agrega:

| Camada | Módulo |
|--------|--------|
| Telemetria | `enterpriseTelemetryHardening` |
| Edge | `enterpriseEdgeHardening` |
| Tenant | `enterpriseTenantHardening` |
| Cognitivo | `enterpriseCognitiveHardening` |
| Observabilidade | `enterpriseObservabilityHardening` |
| Continuidade | `enterpriseContinuity` |
| Maturidade | `enterpriseMaturityConsolidation` |
| Validação | `enterpriseResilienceValidationRuntime` |

## Governança

- `auto_promotion: false`
- `full_rollout: false`
- `shadow_first: true`
- `assistive_only: true`
- `enforcement: false`

## Testes

```bash
cd backend && npm run test:enterprise-hardening-runtime
```

## Integração

`enterpriseEcosystemConsolidationOrchestrator` inclui `pack.enterprise_hardening` no pack de consolidação final.
