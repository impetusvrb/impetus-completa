# Phase Z.10 — Tenant Governance Maturity

## Objectivo

Medir maturidade operacional real do tenant piloto após activação supervisionada de KPI + Summary.

## Métricas

- `maturity_score` — score consolidado
- `governance_maturity` — alinhamento governance
- `operational_reliability` — fiabilidade runtime
- `convergence_maturity` — saúde KPI + summary
- `runtime_sustainability` — sustentabilidade operacional

## Flag

`IMPETUS_TENANT_GOVERNANCE_MATURITY` — OFF por defeito.  
Observabilidade via `IMPETUS_RUNTIME_CONSOLIDATION_OBSERVABILITY` (ON).

## API

`/api/internal/tenant-governance-maturity/*`

## Integração

`GET /dashboard/me` → `tenant_governance_maturity`

## Testes

```bash
npm run test:tenant-governance-maturity
```
