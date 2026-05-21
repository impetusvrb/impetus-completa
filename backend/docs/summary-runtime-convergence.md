# Phase Z.8 — Summary Runtime Convergence

Primeiro runtime narrativo governado (shadow-first) alinhado a KPIs convergentes (Z.7).

## Integração `GET /dashboard/smart-summary`

Blocos aditivos (payload `summary`/`text` **nunca reescrito**):

- `summary_runtime_convergence`
- `summary_narrative_integrity` (Z.8; pode coexistir com rollout — último spread prevalece se ambos activos)
- `summary_governance_health`

## APIs

`/api/internal/summary-convergence/{status,convergence,narrative,stability,governance-health,maturity,evolution,report}`

## Flags

| Variável | Default |
|----------|---------|
| `IMPETUS_SUMMARY_RUNTIME_CONVERGENCE` | off |
| `IMPETUS_SUMMARY_NARRATIVE_ASSURANCE` | off |
| `IMPETUS_SUMMARY_BLINDNESS_DETECTION` | off |
| `IMPETUS_SUMMARY_GOVERNANCE_HEALTH` | off |
| `IMPETUS_SUMMARY_CONVERGENCE_OBSERVABILITY` | on |

Summary enforcement e chat: **OFF**.

## Testes

```bash
npm run test:summary-convergence
```
