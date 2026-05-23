# Z.P0 — Production Native Cognitive Cockpit

## Escopo

Cockpit **production-native** telemetry-centric, aditivo, shadow-first, sem rewrite React/CSS.

## Pacote

- `backend/src/cognitiveRuntime/domains/production/` — cockpit, runtime, bridge, telemetry, observability, kpi
- `backend/src/cognitiveRuntime/registry/productionCognitiveBlockPack.js` — 16 blocos `production.*`
- Flags: `IMPETUS_PRODUCTION_*` em `backend/.env`

## Integração

- Facade: pilot → render promotion → consolidation → `production_cognitive_runtime`
- `/dashboard/me`: `production_cognitive_runtime`, `production_cognitive_centers`, `production_decision_support`
- KPIs: `productionNativeKpiAdapter` em `/dashboard/kpis`
- Frontend: `frontend/src/cognitiveRuntime/domains/production/` + `dashboardContextAdapter` (prioridade após executive, antes de HR)

## Z.P1 — Live validation

Ver `backend/docs/zp1-production-live-validation-report.md`. Flags: `IMPETUS_PRODUCTION_LIVE_VALIDATION=shadow`.

## Testes

```bash
npm run test:production-native-cockpit
npm run test:production-live-validation
npm run test:production-cockpit-readiness
```

## PM2

```bash
pm2 reload impetus-backend --update-env
```
