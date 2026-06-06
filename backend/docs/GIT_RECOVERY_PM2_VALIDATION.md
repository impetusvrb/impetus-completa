# GIT_RECOVERY_PM2_VALIDATION

**FASE:** GIT-RECOVERY-03 — Etapa 03-G  
**Data:** 2026-06-04

---

## Pré-reload (validação em disco)

| Check | Resultado |
|-------|-----------|
| `backend/src/server.js` existe | **Sim** (80 811 B) |
| `backend/src/routes/dashboard.js` existe | **Sim** |
| `frontend/src/App.jsx` existe | **Sim** |
| `node --check backend/src/server.js` | **SYNTAX_OK** |

---

## Reload executado

```bash
pm2 reload impetus-backend --update-env   # ✓
pm2 reload impetus-frontend --update-env  # ✓
```

| Processo | Pós-reload | Uptime | Restarts |
|----------|------------|--------|----------|
| impetus-backend | **online** | ~8s | 351 |
| impetus-frontend | **online** | ~4s | 160 |

`unstable restarts`: 0 em ambos.

---

## Health API

```bash
curl http://127.0.0.1:4000/health
```

| Campo | Valor |
|-------|-------|
| HTTP | **200** |
| `success` | `true` |
| `status` | `ok` |
| `service` | `impetus-backend` |

---

## Veredito Etapa 03-G

**PASS** — PM2 recarregado; backend responde `/health` com 200.
