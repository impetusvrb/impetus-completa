# Production Deployment Orchestrator — Implementação

## Objetivo

Padronizar deploy, reload, health validation e rollback readiness em produção enterprise — **sem nova foundation cognitiva**.

---

## Módulos

`backend/src/productionDeployment/`

| Módulo | Função |
|--------|--------|
| `productionDeploymentOrchestrator.js` | Coordena deploy, flags, readiness |
| `runtimeDeploymentValidator.js` | Health runtime, PM2, governance |
| `safeReloadCoordinator.js` | PM2 reload supervisionado |
| `deploymentRollbackSupervisor.js` | Rollback safety |
| `deploymentHealthConsolidator.js` | Health consolidado |
| `productionDeploymentFacade.js` | Facade |

---

## API

`/api/internal/production-deployment`

| Método | Rota |
|--------|------|
| GET | `/status`, `/health`, `/readiness`, `/rollback`, `/runtime`, `/report` |
| POST | `/deploy/dry`, `/deploy/execute` |

**POST /deploy/execute:** exige `execute: true` e `approved_by`.

---

## Feature flags

| Variável | Default |
|----------|---------|
| `IMPETUS_PRODUCTION_DEPLOYMENT` | **off** |
| `IMPETUS_DEPLOYMENT_VALIDATION` | **off** |
| `IMPETUS_SAFE_RELOAD_COORDINATION` | **off** |
| `IMPETUS_DEPLOYMENT_OBSERVABILITY` | **on** |

---

## Fluxo recomendado

```bash
# 1. Dry run
curl -X POST .../deploy/dry -d '{"approved_by":"ops@empresa"}'

# 2. Revisar /readiness e /rollback

# 3. Activar flags + execute (manual)
curl -X POST .../deploy/execute -d '{"execute":true,"approved_by":"ops@empresa"}'
```

---

## Testes

```bash
npm run test:production-deployment
```
