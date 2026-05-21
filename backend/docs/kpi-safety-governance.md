# Phase Z.5 — KPI Safety Governance

Validação de leakage, underdelivery crítico, conflitos de autoridade e cross-domain.

## API

`/api/internal/kpi-safety/{status,leakage,underdelivery,report}`

## Comportamento

- Detecta riscos; **não** auto-remedia
- Underdelivery crítico sinalizado para graceful preservation no pipeline

## Flag

`IMPETUS_KPI_SAFETY_VALIDATION` — default **off** (observabilidade via `IMPETUS_KPI_PILOT_OBSERVABILITY`)

## Testes

```bash
npm run test:kpi-safety
```
