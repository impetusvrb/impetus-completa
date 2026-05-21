# Phase Z.7 — KPI Runtime Convergence

Consolida Z.5 (enforcement) + Z.6 (stability) com convergência contextual e assurance executivo/operacional.

## Integração `GET /dashboard/kpis`

Blocos aditivos (após Z.6):

- `kpi_runtime_convergence`
- `kpi_cockpit_integrity`
- `kpi_governance_health`

**Não altera** `kpis` por defeito — recommendation-first.

## APIs

`/api/internal/kpi-convergence/{status,convergence,coherence,assurance,cockpit,governance-health,maturity,evolution,report}`

## Flags

| Variável | Default |
|----------|---------|
| `IMPETUS_KPI_RUNTIME_CONVERGENCE` | off |
| `IMPETUS_EXECUTIVE_OPERATIONAL_ASSURANCE` | off |
| `IMPETUS_KPI_BLINDNESS_DETECTION` | off |
| `IMPETUS_KPI_GOVERNANCE_HEALTH` | off |
| `IMPETUS_KPI_CONVERGENCE_OBSERVABILITY` | on |

## Testes

```bash
npm run test:kpi-convergence
```
