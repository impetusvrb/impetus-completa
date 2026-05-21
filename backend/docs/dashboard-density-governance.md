# Phase Z.1 — Dashboard Density Governance

## Objetivo

Evitar cockpits vazios, excesso de widgets e dashboards genéricos — **recommendation mode only**.

## Módulos

`backend/src/dashboardDensity/`

- `dashboardDensityAnalyzer` — score de densidade
- `operationalDashboardReducer` / `executiveDashboardReducer` — simulação de cap
- `contextualDensitySupervisor` — orquestração

## API

`/api/internal/dashboard-density/{status,readiness,report}`

## Integração Z.0 → Z.1

- Z.0 observa genericidade
- Z.1 quantifica `density_score` e simula redução

## Testes

```bash
npm run test:dashboard-density
```
