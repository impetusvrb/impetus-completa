# Phase Z.11 — Tenant Expansion Scaling

## Objectivo

Classificar tenants piloto para expansão supervisionada (maduros, instáveis, escaláveis, alto risco) sem auto-expansão.

## Classificações

- `mature_scalable` — elegível para revisão supervisionada
- `scaling_candidate` — maturidade intermédia
- `unstable` / `high_risk` / `immature` — expansão bloqueada (recomendação)

## Flag

`IMPETUS_TENANT_EXPANSION_SCALING` — OFF por defeito.

## API

`/api/internal/tenant-expansion-scaling/*`

## Integração

`GET /dashboard/me` → `tenant_expansion_maturity`

## Testes

```bash
npm run test:tenant-expansion-scaling
```
