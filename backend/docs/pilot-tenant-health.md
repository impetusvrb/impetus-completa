# Phase Z.12 — Pilot Tenant Health

## Objectivo

Medir saúde operacional do tenant piloto: integrity, governance reliability, runtime confidence, rollout sustainability.

## Métricas

- `health_score` — score consolidado
- `integrity` — fiabilidade operacional
- `governance` — maturidade governance
- `confidence` — confiança runtime supervisionada

## Flag

`IMPETUS_PILOT_HEALTH_SUPERVISION` — OFF por defeito. Observabilidade via `IMPETUS_RUNTIME_OBSERVATION_CONSOLIDATION` (ON).

## API

`/api/internal/pilot-tenant-health/*`

## Integração

`GET /dashboard/me` → `pilot_tenant_health`

## Testes

```bash
npm run test:pilot-tenant-health
```
