# Phase Z.4 — KPI Enforcement Preparation

## Regra crítica

**NÃO** aplica filtragem de KPIs. Apenas simula:

- KPIs que seriam escondidos
- KPIs preservados
- Risco de underdelivery
- Leakage contextual

## API

`GET /api/internal/kpi-preparation/{status,readiness,leakage,underdelivery,report}`

## Flag

`IMPETUS_KPI_ENFORCEMENT_PREPARATION` — default **off**

## Próximo passo (pós Z.4)

Quando `kpi_channel_ready` e maturidade ≥ 0.72, equipa pode planear activação supervisionada do canal KPI (fase futura).

## Testes

```bash
npm run test:kpi-enforcement-preparation
```
