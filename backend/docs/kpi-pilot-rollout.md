# Phase Z.5 — KPI Pilot Rollout

## Evolução pós Z.4

Z.4 preparou simulação; Z.5 aplica filtragem **real** conservadora.

## Path operacional

1. Z.3 menu enforcement estável no piloto
2. Z.4 `kpi_channel_ready` + maturidade ≥ 0.72
3. Activar flags Z.5
4. `readiness` → `simulate_only` (opcional via body) → `activate`
5. Observar `/api/internal/kpi-pilot-observability/report`
6. Rollback se degradación

## APIs consolidadas

| Prefixo | Uso |
|---------|-----|
| `/api/internal/kpi-runtime-enforcement` | activate, rollback, readiness |
| `/api/internal/kpi-safety` | leakage, underdelivery |
| `/api/internal/kpi-pilot-observability` | report consolidado |

## Garantias graceful

- Mínimos por tier restaurados **do payload original**
- Executivo: preservação financeira/estratégica existente
- Dashboard nunca vazio (integrity guard + emergency restore limitado)

## Testes

```bash
npm run test:kpi-runtime-enforcement
npm run test:kpi-safety
npm run test:kpi-pilot-observability
```
