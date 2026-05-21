# Phase Z.7 — KPI Governance Health

Métricas: `health_score`, `maturity_score`, `delivery_confidence`, `operational_reliability`.

## API

`/api/internal/kpi-governance-health/{status,governance-health,maturity,report}`

## Roadmap KPI enterprise

1. Z.5 — enforcement real (piloto)
2. Z.6 — estabilização + mínimos
3. Z.7 — convergência + health (esta fase)
4. Futuro — summary/chat (ainda OFF)

## Rollback

`POST /api/internal/kpi-runtime-enforcement/rollback/:tenant`

## Testes

```bash
npm run test:kpi-governance-health
```
