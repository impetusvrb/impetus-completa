# REG-002 R2 — Industrial Map Recovery

**Fase:** REG-002 · **Prioridade:** P1

---

## Antes → Depois

| Item | Antes | Depois | Evidência |
|------|-------|--------|-----------|
| UI IndustrialOperationsCenter | ✅ | ✅ | page inalterada |
| React route | ✅ | ✅ | `/app/centro-operacoes-industrial` |
| api.js `dashboard.industrial` | ✅ | ✅ | client inalterado |
| Backend `/industrial/*` | ❌ | ✅ | `dashboardIndustrial.js` |
| Service | ✅ | ✅ | `industrialOperationalMapService` |

---

## Causa raiz

`route_not_mounted` — `getFactoryMap` / `machineBrain.listProfiles` existiam sem HTTP.

## Alteração aplicada

Router thin `dashboardIndustrial.js`:

| Endpoint | Delegação |
|----------|-----------|
| GET `/status` | `getFactoryMap` → machines_count, profiles, events |
| GET `/events` | map.recent_events |
| GET `/profiles` | `machineBrain.listProfiles` |
| GET `/automation` | `industrial_automation_config` (já usada por automationTriggerService) |
| POST `/automation` | update/insert config (admin) |
| GET `/machines` | flatten factory map |
| POST `/command` | machineControl se existir; senão 501 |

CRUD machines create/update/delete → 501 explícito (sem inventar service).

## Ficheiros

- `backend/src/routes/dashboardIndustrial.js` (**novo**)
- `backend/src/routes/dashboard.js` (`router.use('/industrial', …)`)

## Risco

Medium — superfície API maior; RBAC admin em mutações.

## Rollback

Remover mount + ficheiro router.

## Validação

```bash
npm run test:reg002-industrial-map
```
