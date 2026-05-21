# Phase Z.13 — Real KPI Targeting

KPIs filtrados por domínio/hierarquia em tenants piloto activos — **sem inventar KPIs**.

Delega para `kpiRuntimeEnforcement` (Z.5) com orquestração Z.13.

## Activação KPI

```http
POST /api/internal/kpi-runtime-enforcement/activate/:tenant
{ "execute": true, "approved_by": "ops@empresa", "kpis_before": [] }
```

## Flags

- `IMPETUS_KPI_RUNTIME_ENFORCEMENT=on`
- `IMPETUS_TENANT_KPI_ENFORCEMENT=on`
- `IMPETUS_KPI_VISIBILITY_STABILIZATION=on`
- `IMPETUS_KPI_TARGETING_HARDENING=on`

## Testes

```bash
npm run test:real-kpi-targeting
```
