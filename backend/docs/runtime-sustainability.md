# Phase Z.10 — Runtime Sustainability

## Objectivo

Medir sustentabilidade do runtime cognitivo supervisionado sem auto-expansão nem auto-remediação.

## Dimensões

- Governance sustainability
- Convergence sustainability (KPI + summary)
- Operational pressure
- Scalability readiness (recomendação only)

## Flag

`IMPETUS_RUNTIME_SUSTAINABILITY` — OFF por defeito.

## API

`/api/internal/runtime-sustainability/*` — status, sustainability, pressure, fatigue, report

## Governance pressure

`IMPETUS_GOVERNANCE_PRESSURE_ANALYSIS` — detecta saturação, fadiga e overload observability.

## Testes

```bash
npm run test:runtime-sustainability
```
