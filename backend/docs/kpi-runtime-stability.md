# Phase Z.6 — KPI Runtime Stability

Estabiliza o enforcement Z.5 sem activar summary/chat.

## Integração `GET /dashboard/kpis`

Blocos aditivos (após Z.5):

- `kpi_runtime_stability`
- `kpi_visibility_integrity`
- `kpi_operational_quality`

Altera `kpis` apenas com flags de hardening ON e underdelivery crítico (restauro do snapshot original).

## APIs

`/api/internal/kpi-runtime-stability/{status,stability,visibility,underdelivery,blindness,targeting,convergence,cockpit,rollback,report}`

## Flags

| Variável | Default |
|----------|---------|
| `IMPETUS_KPI_VISIBILITY_STABILIZATION` | off |
| `IMPETUS_KPI_UNDERDELIVERY_HARDENING` | off |
| `IMPETUS_KPI_TARGETING_HARDENING` | off |
| `IMPETUS_KPI_DASHBOARD_STABILIZATION` | off |
| `IMPETUS_KPI_RUNTIME_STABILITY_OBSERVABILITY` | on |

## Testes

```bash
npm run test:kpi-runtime-stability
```
