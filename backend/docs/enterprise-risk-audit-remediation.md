# Auditoria Enterprise — Riscos Arquitecturais e Operacionais

**Data:** 2026-05-15  
**Papel:** Arquiteto Enterprise / SRE / Security / Runtime Auditor  
**Princípio:** aditivo, feature-flagged, retrocompatível, reversível

---

# [CONFIRMADO] — Riscos que ainda existiam

## RISCO 1 — Cache invalidation / hard refresh

| Item | Evidência |
|------|-----------|
| Sem negociação runtime de versão | Não existia `/api/system/frontend-build` nem `build-meta.json` |
| Dependência de hard refresh | `frontend/src/main.jsx` L26 sugere Ctrl+Shift+R em falha de boot |
| Service workers residuais | `chat-sw.js`, `manuia-sw.js` ainda registados; `main.jsx` apenas faz unregister genérico |
| Vite hashes | Default Rollup `[name]-[hash].js` — OK, mas `index.html` em cache antigo pode apontar chunks inexistentes pós-deploy |

**Impacto:** chunk 404, SPA desincronizada após deploy sem hard refresh.  
**Regressão possível:** reload em loop se mal configurado.  
**Mitigação implementada:** ver [IMPLEMENTADO].

---

## RISCO 2 — Frontend deploy window / rm -rf dist

| Item | Evidência |
|------|-----------|
| `vite build` com `emptyOutDir: true` | `frontend/vite.config.js` — apaga `dist/` no início do build |
| Deploy documentado com `rm -rf dist` | `backend/docs/domain-isolation-controlled-deploy.md` L11, L67 |
| Serve directo de `dist/` | `frontend/serveDist.cjs` L17 — PM2 `preview:prod` |
| ENOENT transitório | Documentado explicitamente no deploy doc |

**Impacto:** janela de downtime / 404 em assets durante rebuild.  
**Rollback:** manter `dist_backup_*` após deploy atómico.

---

## RISCO 3 — Shadow route security

| Item | Evidência |
|------|-----------|
| Rota shadow exposta | `POST /api/internal/test-environmental-cognitive` |
| Protecção parcial prévia | `requireAuth` + `requireInternalAccess` (Enterprise Hardening Bloco 1) |
| Flag por rota | `IMPETUS_ENVIRONMENTAL_COGNITIVE_SHADOW` — mas sem registry central |
| Produção | Sem deny-by-default unificado; sem audit buffer estruturado por rota |

**Impacto:** superfície de ataque se flags/roles mal configurados.  
**Nota:** rota **não removida** — apenas reforçada.

---

## RISCO 4 — Structured input governance

| Item | Evidência |
|------|-----------|
| Validação inline | `cognitiveControllerService.js` — allowlist + check `metrics` object |
| Sem registry central | Domínios futuros (RH, financeiro, qualidade) duplicariam lógica |
| Permissivo | `.passthrough()` em métricas ambientais |

**Impacto:** superfície cognitiva crescente sem contratos tipados.  
**Compatibilidade:** códigos de erro legados preservados (`INVALID_ENVIRONMENTAL_PAYLOAD`).

---

# [JÁ RESOLVIDO] — Protecções existentes antes desta auditoria

| Área | Protecção | Ficheiro |
|------|-----------|----------|
| Rotas internas | `requireInternalAccess` + `IMPETUS_INTERNAL_ROUTES_ENABLED` | `internalRouteGuard.js`, `server.js` L367-379 |
| HTML no-store em produção | `Cache-Control: no-store` em `*.html` | `serveDist.cjs` L59-62 |
| JS/CSS must-revalidate | `serveDist.cjs` L117-120 | Após deploy força revalidação |
| Auth enterprise | JWT strict tenant, no token in query default | `auth.js` (Hardening Bloco 6) |
| Migrations | Advisory lock, fail-fast `start.sh` | `migrationGovernanceService.js` |
| Motor A/B + feature flags | `featureGovernanceService` snapshot no boot | `server.js` |
| Environmental shadow | `requireHealthAccess` + flag shadow | `environmentalCognitiveTest.js` |

---

# [IMPLEMENTADO] — Correções aplicadas nesta auditoria

## RISCO 1 — Cache invalidation

| Componente | Ficheiro | Descrição |
|------------|----------|-----------|
| Build manifest | `frontend/vite.config.js` — `buildMetaPlugin()` | Gera `dist/build-meta.json` + `__IMPETUS_BUILD_ID__` |
| API versão | `backend/src/services/frontendBuildVersionService.js` | Lê manifest com cache 5s |
| Endpoint | `GET /api/system/frontend-build` | `server.js` — `Cache-Control: no-store` |
| Runtime guard | `frontend/src/hooks/useBuildVersionGuard.js` | Poll 5min + visibility; reload único via `sessionStorage` |
| Integração UI | `frontend/src/components/BuildVersionGuard.jsx` + `App.jsx` | Sem alteração visual |

**Flags:** `VITE_BUILD_VERSION_GUARD` (default on), `VITE_BUILD_VERSION_POLL_MS` (300000), `IMPETUS_BUILD_ID`

**Rollback:** desactivar `VITE_BUILD_VERSION_GUARD=false` no build frontend.

**Observabilidade:** logs `[BuildVersionGuard]` no browser.

**Nota deploy:** reiniciar `impetus-backend` para expor `/api/system/frontend-build`.

---

## RISCO 2 — Deploy atómico

| Componente | Ficheiro | Descrição |
|------------|----------|-----------|
| Script atómico | `frontend/scripts/atomic-deploy-build.cjs` | Build → `dist_next` → validate → swap → `dist_backup_*` |
| npm script | `npm run build:atomic` | `frontend/package.json` |
| Vite outDir | `VITE_OUT_DIR`, `VITE_ATOMIC_BUILD=true` | Não apaga `dist` activo durante build |
| serveDist | `DIST_DIR` / `IMPETUS_DIST_DIR` env | Serve directório configurável |

**Rollback:** `mv dist_backup_<ts> dist` + `pm2 restart impetus-frontend`

**Compatibilidade:** `npm run build` inalterado (comportamento legado).

---

## RISCO 3 — Shadow route security

| Componente | Ficheiro | Descrição |
|------------|----------|-----------|
| Registry | `backend/src/middleware/shadowRouteRegistry.js` | Rotas shadow + flags + audit buffer |
| Guard | `requireShadowRoute('env-cognitive-test')` | `environmentalCognitiveTest.js` |
| API registry | `GET /api/internal/shadow-routes` | Lista + audit (internal_admin) |
| Produção deny | `IMPETUS_SHADOW_ROUTES_ENABLED=false` → 404 global | |
| Flag por rota | `IMPETUS_ENVIRONMENTAL_COGNITIVE_SHADOW` | 403/404 se OFF |

**Observabilidade:** `[SHADOW_ROUTE_ACCESS]` JSON structured logs.

**Rollback:** flags anteriores; remover guard da rota (não recomendado).

---

## RISCO 4 — Structured input governance

| Componente | Ficheiro | Descrição |
|------------|----------|-----------|
| Schema registry | `backend/src/services/structuredInputSchemaRegistry.js` | Zod + domínio `environmental` |
| Integração | `cognitiveControllerService.js` | Validação centralizada + códigos legados |
| Strict mode | `STRUCTURED_INPUT_SCHEMA_STRICT=false` (default) | Backward-compatible |

**Rollback:** bypass via não usar registry (não exposto) — flag strict off mantém passthrough.

---

# [NÃO IMPLEMENTADO] — Documentado apenas

| Item | Motivo |
|------|--------|
| Remover `chat-sw.js` / `manuia-sw.js` | Poderia quebrar push/offline do chat e ManuIA — requer análise de produto |
| Nginx blue/green externo | Infra não versionada neste repo; script atómico cobre PM2+serveDist |
| CIDR parsing em IP allowlist | Delegado a firewall; literal match apenas |
| Schemas Zod para RH/financeiro/qualidade | Fundação criada; domínios adicionais quando existirem payloads |
| OpenTelemetry no frontend build guard | Backend observability já existe noutro plano |

---

# Validações executadas

| Check | Resultado |
|-------|-----------|
| `npm run test:enterprise-risk-audit` | **12/12** |
| `npm run test:enterprise-hardening` | 20/20 (histórico) |
| PM2 `impetus-backend` | online |
| PM2 `impetus-frontend` | online |
| `GET /health` | 200 |
| `GET :3000/` | 200 |
| `GET /api/system/frontend-build` | **Requer restart backend** (código adicionado) |
| Motor A/B / governança | Sem alteração de authority runtime |
| CSS/layout | **Zero alterações** |

---

# Matriz resumo por risco

| Risco | Estado pré-auditoria | Acção | Rollback |
|-------|---------------------|-------|----------|
| 1 Cache | CONFIRMADO | IMPLEMENTADO | Flag `VITE_BUILD_VERSION_GUARD=false` |
| 2 Deploy window | CONFIRMADO | IMPLEMENTADO | Usar `npm run build` legado |
| 3 Shadow routes | PARCIAL | IMPLEMENTADO (reforço) | `IMPETUS_SHADOW_ROUTES_ENABLED=false` |
| 4 Structured input | CONFIRMADO | IMPLEMENTADO (fundação) | `STRUCTURED_INPUT_SCHEMA_STRICT=false` |

---

# Deploy recomendado (sem downtime desnecessário)

```bash
# 1. Backend — expor novo endpoint
cd /var/www/impetus-completa/backend
npm run migrate   # se houver pendentes
pm2 restart impetus-backend --update-env

# 2. Frontend — build atómico (sem apagar dist durante build)
cd /var/www/impetus-completa/frontend
npm run build:atomic
pm2 restart impetus-frontend --update-env

# 3. Validar
curl -s http://127.0.0.1:4000/api/system/frontend-build
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/
```
