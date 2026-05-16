# Relatório — Restart Enterprise-Grade IMPETUS

**Data:** 2026-05-15 14:43–14:48 UTC  
**Operador:** SRE automatizado (auditoria + promoção controlada)  
**Backup:** `/var/www/impetus-completa/backups/enterprise-restart-20260515-144351`

---

# [ESTADO ANTES]

## Runtime PM2

| Processo | PID | Uptime | Restarts | Memória | Script |
|----------|-----|--------|----------|---------|--------|
| impetus-backend | 2945308 | ~2D | 118 | ~114 MB | `backend/src/server.js` |
| impetus-frontend | 2930116 | ~2D | 62 | ~60 MB | `npm run preview:prod` |
| lipsync-api | 766 | 36D | 0 | ~27 MB | — |

## Código em disco vs runtime (gaps detectados)

| Capacidade | Disco | Runtime (antes) |
|------------|-------|-----------------|
| `GET /api/system/frontend-build` | ✅ server.js | ❌ **404** |
| `internalNetworkGuard` / CIDR | ✅ | ❌ não carregado (uptime 2D) |
| `build-meta.json` + BuildVersionGuard | ✅ fontes | ❌ dist sem manifest (12 Mai) |
| Shadow route registry | ✅ | ❌ não carregado |
| Operational runtime 12 fases | ✅ | ❌ não carregado |

## Frontend activo (antes)

- `dist/` datado **2026-05-12 21:39**
- **Sem** `build-meta.json`
- Bundles antigos (ex.: hashes pré-restart)

---

# [BACKUPS]

| Artefacto | Localização | Tamanho |
|-----------|-------------|---------|
| dist activo | `backups/enterprise-restart-20260515-144351/frontend/dist_active` | ~107 MB |
| backend .env | `.../backend/.env` | cópia |
| PM2 dump | `.../pm2/process-list.json` + `pm2 save` | — |
| dist_backup (atomic) | `frontend/dist_backup_1778856382589` | gerado no swap |

**Integridade:** cópia `cp -a` preservou permissões e timestamps.

---

# [PROMOVIDO]

## Migrations (seguras)

- `202605131_audit_immutability_triggers_migration.sql` — executada
- `safe_vector_migration_template.sql` — executada
- 82 já aplicadas (skip)
- 0 destrutivas / 0 bloqueadas

## Backend

- `pm2 reload impetus-backend --update-env` (gracioso, sem delete)
- Novo PID: **3051313**, restart count 119

**Entrou em runtime:**

- Internal Network Governance (CIDR + anti-spoof)
- `GET /api/system/frontend-build`
- `GET /api/internal/governance/status`
- Shadow route registry reforçado
- Structured input schema registry
- Operational runtime pipeline (12 fases) — rotas `/api/internal/operational-runtime`

## Frontend

- `npm run build:atomic` — build em `dist_next`, validação, swap atómico
- `pm2 reload impetus-frontend --update-env`
- Novo PID: **3051342**, restart count 63

**Entrou em produção:**

- `build-meta.json` — `build_id: bmp714iwc`, `built_at: 2026-05-15T14:46:21.596Z`
- BuildVersionGuard + hashes novos (115 bundles)
- Chunks com cache `must-revalidate` via serveDist

---

# [VALIDAÇÃO]

## Infra

| Check | Resultado |
|-------|-----------|
| `GET /api/system/frontend-build` | **200** — build_id activo |
| Frontend `:3000/` | **200** |
| Backend health | OK (pós-warmup) |
| PM2 | 3 processos **online** |
| Chunk principal | **200** (sem 404) |

## Testes automatizados

| Suite | Resultado |
|-------|-----------|
| `test:enterprise-internal-network` | 12/12 |
| `test:enterprise-hardening` | 20/20 |

## Governança

- Motor A/B: sem alteração de código de authority — **intacto**
- Feature governance snapshot no boot: **7 flags**, 0 findings críticos
- Tenants / migrations tenant_admins: **sem mudanças destrutivas**

## Segurança (runtime)

- `internalNetworkGuard` carregado — dev bypass activo fora de `production`
- Logs `[FEATURE_GOVERNANCE_SNAPSHOT]` no boot — OK
- CIDR enforcement: configurável via env (default aberto até `DENY_BY_DEFAULT=true`)

---

# [OBSERVABILIDADE]

## Logs capturados

- `[FEATURE_GOVERNANCE_SNAPSHOT]` — boot backend, sem erros
- `[serveDist]` — frontend a servir `dist` novo
- Sem crash loops pós-reload
- Sem ENOENT em `serveDist` após swap atómico

## Warnings

- Vite: chunks >500kB (pré-existente, não bloqueante)
- PM2 describe expõe env no dump — **não alterar .env** sem auditoria humana

---

# [ROLLBACK] — Instruções prontas (NÃO executadas)

## Frontend

```bash
cd /var/www/impetus-completa/frontend
rm -rf dist
mv dist_backup_1778856382589 dist
# ou: cp -a backups/enterprise-restart-20260515-144351/frontend/dist_active dist
pm2 reload impetus-frontend --update-env
```

## Backend

```bash
pm2 reload impetus-backend --update-env
# código anterior permanece em disco; reload só se reverter git/checkout
```

## Flags de emergência (sem redeploy)

```env
IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT=false
VITE_BUILD_VERSION_GUARD=false
IMPETUS_SHADOW_ROUTES_ENABLED=false
```

---

# [RESULTADO FINAL]

| Critério | Status |
|----------|--------|
| Sistema saudável | ✅ |
| Deploy seguro e reversível | ✅ |
| Zero regressão nos testes | ✅ |
| Downtime relevante | ❌ Não — reload gracioso + swap atómico |
| Governança intacta | ✅ |
| Código novo em runtime | ✅ |
| build-meta + version API | ✅ |

**Recomendação pós-restart:** em produção, activar quando política de rede estiver definida:

```env
IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT=true
IMPETUS_INTERNAL_ROUTE_CIDR_ALLOWLIST=<VPN/CIDR da empresa>
```
