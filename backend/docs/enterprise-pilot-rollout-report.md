# Enterprise Pilot Rollout — Relatório

**Framework:** Controlled Enterprise Pilot Rollout Preparation  
**Domínios:** QUALITY · SAFETY · LOGISTICS  
**Data:** 2026-05-17

## API

- `POST /api/enterprise-pilot-rollout/prepare`
- `POST /api/enterprise-pilot-rollout/metrics/event`
- `POST /api/enterprise-pilot-rollout/governance/*` (freeze, pause, rollback, advance-wave)

## Fases

1. Selecção tenant (`enterprisePilotTenantSelector`)
2. Audiência gradual (`audiencePilotMatrix` waves 1–5)
3. Métricas pilot (`enterprisePilotMetricsCollector`)
4. Governança (`rolloutGovernanceRuntime`)
5. Dashboard executivo (`EnterprisePilotExecutiveDashboard`)

## Proibido

FULL rollout · auto-promotion · publication global

## Testes

`npm run test:enterprise-pilot-rollout`
