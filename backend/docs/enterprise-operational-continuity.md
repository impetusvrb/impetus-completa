# Enterprise Operational Continuity

## Capacidades

- `enterprisePublicationContinuityRuntime` — pipeline multi-domínio (`multiDomainPublicationValidator`)
- `enterpriseRolloutContinuityRuntime` — `enterpriseControlledRolloutEngine` (shadow, sem auto-promotion)
- `enterpriseIndustrialContinuityRuntime` — agregação telemetria/edge/cognitivo/publicação/rollout

## Fragmentação

`fragmentation_detected` quando publicação ou rollout apresentam risco de fragmentação.

## Teste

```bash
cd backend && npm run test:enterprise-operational-continuity
```
