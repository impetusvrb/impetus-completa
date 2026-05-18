# ENVIRONMENT Shadow Activation Deploy Report

**Data:** 2026-05-18  
**Tipo:** Enterprise Controlled Activation — Ambiental / SGA-EHS  
**Estado alvo:** **Enterprise Shadow Operational**  
**Decisão:** **GO — SHADOW ACTIVE** ✅

---

## Resumo executivo

Deploy shadow do domínio **ENVIRONMENT** concluído com:

- flags activadas (backend + frontend Vite);
- preflight **7/7** checks GO;
- build frontend OK (vite 4697 módulos);
- `pm2 reload` leve (frontend + backend, `--update-env`);
- smoke tests OK (401 auth nos endpoints protegidos);
- `definitive_publication: false`, `activation_stage: shadow`;
- correcção de manifest duplicado (`?context=widgets`).

**Não executado:** migrations, pm2 delete, restart enterprise pesado, FULL rollout, auto-promotion.

---

## Fase 1 — Pre-flight

Ver: `backend/docs/environment-shadow-activation-preflight.md`

- Preflight: **GO_SHADOW_ACTIVATION**
- Runtime: `backend/src/domains/environment/activation/environmentShadowPreflightRuntime.js`

---

## Fase 2 — Backup leve

**Path:** `backend/backups/environment-shadow-activation-20260518T152509Z/`

| Conteúdo |
|----------|
| `env/backend.env`, `env/frontend.env.production`, `env/frontend.env` |
| `dist/frontend-dist-snapshot/` |
| `pm2/pm2-snapshot.json`, `pm2/pm2-post-reload.json` |
| `flags/runtime-flags-before.txt`, `runtime-flags-after.txt` |
| `reports/*.txt`, `preflight-*.json`, `deploy-summary.json` |

---

## Fase 3 — Flags backend (`backend/.env`)

```env
IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=true
IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_COGNITIVE_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_ACTIVATION_STAGE=shadow
IMPETUS_ENVIRONMENT_ROLLOUT_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_PUBLICATION_AUDIENCE_PREVIEW=true
```

---

## Fase 4 — Flags frontend (`frontend/.env.production`, `frontend/.env`)

```env
VITE_IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_NAVIGATION_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_OPERATIONAL_VISIBILITY_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_GOVERNANCE_VISIBILITY_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_EXECUTIVE_VISIBILITY_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_COGNITIVE_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED=true
```

---

## Fase 5 — Build

Ver: `backend/docs/environment-shadow-build-validation.md` — **exit 0**

---

## Fase 6 — Reload PM2

| Processo | Acção | Resultado |
|----------|-------|-----------|
| `impetus-frontend` | `pm2 reload --update-env` | ✅ |
| `impetus-backend` | `pm2 reload --update-env` | ✅ |

---

## Fase 7 — Smoke tests

Ver: `backend/docs/environment-shadow-runtime-validation.md`

---

## Fase 8–10 — Audience, cognitive, rollout

Ver:

- `environment-shadow-publication-validation.md`
- `environment-shadow-rollout-readiness.md`

---

## Fase 11 — Observação controlada

**Recomendado:** 15–30 min monitorizar `pm2 logs impetus-backend --lines 50` e menu com tenant `environment_intelligence`.

Métricas: `environment_publication_runtime_ms`, `environment_rollout_readiness_score`, `environment_sidebar_stability_score`.

---

## Rollback

```bash
BK=backend/backups/environment-shadow-activation-20260518T152509Z
cp "$BK/env/backend.env" backend/.env
cp "$BK/env/frontend.env.production" frontend/.env.production
cp -a "$BK/dist/frontend-dist-snapshot" frontend/dist
pm2 reload impetus-backend --update-env
pm2 reload impetus-frontend --update-env
```

---

## Comando de re-deploy

```bash
cd backend && npm run deploy:environment-shadow-activation
```

---

## Estado final

| Item | Valor |
|------|-------|
| Domínio | ENVIRONMENT |
| Modo | **Enterprise Shadow Operational** |
| FULL rollout | ❌ não |
| Auto-promotion | ❌ não |
| Registry status | `shadow` |
