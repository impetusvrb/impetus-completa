# Phase Z.10 — Runtime Governance Consolidation

## Objectivo

Consolidar maturity, stability, sustainability, fatigue, usefulness e histórico de rollout numa camada enterprise observável.

## Blocos em `/dashboard/me`

- `tenant_governance_maturity`
- `runtime_sustainability`
- `runtime_operational_usefulness`

Payload legacy **não é alterado** (visible_modules, perfil, etc.).

## Flags

| Flag | Defeito |
|------|---------|
| `IMPETUS_TENANT_GOVERNANCE_MATURITY` | OFF |
| `IMPETUS_RUNTIME_SUSTAINABILITY` | OFF |
| `IMPETUS_GOVERNANCE_PRESSURE_ANALYSIS` | OFF |
| `IMPETUS_EXPANSION_READINESS_VALIDATION` | OFF |
| `IMPETUS_RUNTIME_CONSOLIDATION_OBSERVABILITY` | ON |

**Chat** e **boundary** continuam OFF.

## Expansion readiness

`tenantExpansionReadiness` recomenda se o tenant pode expandir rollout — **nunca** auto-expande.

## API

`/api/internal/runtime-governance-consolidation/*` — maturity, stability, sustainability, fatigue, pressure, usefulness, readiness, evolution, report

## PM2

```bash
pm2 reload impetus-backend --update-env
```

## Roadmap pós-Z.10

- Chat runtime supervisionado (fase dedicada)
- Multi-tenant expansion após métricas de sustainability estáveis
- Boundary enforcement (fase futura, separada)

## Testes

```bash
npm run test:runtime-governance-consolidation
npm run test:tenant-governance-maturity
npm run test:runtime-sustainability
```
