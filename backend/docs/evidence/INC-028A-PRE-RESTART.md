# INC-028A — Snapshot Pré-Restart (Backend)

**Timestamp UTC:** 2026-07-16T12:35:00Z (aprox.)  
**Modo:** DEPLOY_MODE=CONTROLLED | FAIL_SAFE=ENABLED  
**Escopo:** apenas `impetus-backend`

---

## Etapa 1 — Pré-check

| Check | Resultado |
|-------|-----------|
| PM2 online | **PASS** |
| `impetus-backend` presente | **PASS** (id=3) |
| Restart em andamento | **PASS** (nenhum) |
| Memória disponível | **PASS** (~5.4 GiB available) |
| Disco `/` | **PASS** (17G livres, 83% uso) |
| Porta backend `4000` | **PASS** (LISTEN 127.0.0.1:4000) |
| Porta PostgreSQL `5432` | **PASS** |
| Processos zombie | **PASS** (count=0) |

---

## PM2 — impetus-backend (pré-restart)

| Campo | Valor |
|-------|-------|
| status | online |
| pid | 1951784 |
| uptime | ~23 min |
| restart count | 372 |
| rss (ps) | ~244 MiB heap PM2 / processo activo |
| cpu | 0% (idle) |
| script | `/var/www/impetus-completa/backend/src/server.js` |
| cwd | `/var/www/impetus-completa/backend` |
| node | 20.20.0 |
| unstable_restarts | 0 |

---

## PM2 list (resumo)

| name | status | pid | uptime | ↺ |
|------|--------|-----|--------|---|
| impetus-backend | online | 1951784 | ~23m | 372 |
| impetus-frontend | online | 1892599 | 12h | 18 |
| impetus-admin-portal | online | 1776338 | 26h | 2 |
| labs (modbus/opcua/oidc/smtp/edge) | online | vários | 27h | 0 |
| pm2-logrotate | online | 1761954 | — | 0 |

**Nota:** frontend, admin-portal e labs **não** serão reiniciados nesta INC.

---

## Últimas linhas de log (pré-restart)

### error.log (amostra — sem crash iminente)

- `[DB][POOL_PRESSURE]` — avisos de pool wait (pré-existentes)
- `[APPSEC_RUNTIME_CONFIG]` — aviso de evidência
- `[SEC-05_BOOT] Unexpected token '}'` — aviso boot (pré-existente)
- **Sem** OOM, crash loop ou Module not found imediato antes do restart

### out.log (amostra)

- `[INDUSTRIAL_EVENT_PUBLISHED]` environment.telemetry — operação normal multi-tenant

---

## Decisão pré-restart

**PRECHECK = PASS** — autorizado restart controlado de `impetus-backend` apenas.

---

## Comando planeado

```bash
pm2 restart impetus-backend --update-env
```

**Não executar:** restart de frontend, admin-portal, labs, logrotate.
