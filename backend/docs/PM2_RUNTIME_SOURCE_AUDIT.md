# PM2_RUNTIME_SOURCE_AUDIT

**FASE:** GIT-AUDIT-01  
**Data:** 2026-06-04  
**Modo:** READ ONLY  
**Comandos:** `pm2 describe impetus-backend`, `pm2 describe impetus-frontend`, `pm2 list`

---

## impetus-backend

| Campo | Valor |
|-------|-------|
| **status** | online |
| **script path** | `/var/www/impetus-completa/backend/src/server.js` |
| **exec cwd** | `/var/www/impetus-completa/backend` |
| **interpreter** | node |
| **exec mode** | fork_mode |
| **version (package)** | 0.1.0 |
| **uptime (amostra)** | ~15h |
| **restarts** | 350 (histórico acumulado) |

**Ecosystem file dedicado:** não encontrado `ecosystem.config.js` principal; existe `backend/ecosystem.industrial-lab.config.js` (lab industrial, não o processo `impetus-backend`).

**Conclusão:** produção backend = árvore **`/var/www/impetus-completa/backend/`** (raiz do repo), **não** `impetus_complete/backend/`.

---

## impetus-frontend

| Campo | Valor |
|-------|-------|
| **status** | online |
| **script path** | `/usr/bin/npm` |
| **script args** | `run preview:prod` |
| **exec cwd** | `/var/www/impetus-completa/frontend` |
| **interpreter** | node |
| **exec mode** | fork_mode |
| **uptime (amostra)** | ~15h |
| **restarts** | 159 |

**Conclusão:** produção frontend = árvore **`/var/www/impetus-completa/frontend/`**.

---

## Outros processos PM2 (contexto)

| Nome | Nota |
|------|------|
| impetus-edge-agent-lab | Lab edge |
| impetus-lab-modbus / opcua / oidc / smtp | Lab industrial |
| lipsync-api | Serviço lipsync (separado) |

Nenhum aponta para `impetus_complete/backend/src/server.js`.

---

## Relação com commit `7ea6cb2b8`

O commit **não** alterou `backend/src/server.js` nem `frontend/` no Git. Os paths PM2 são os **oficiais da raiz**, alinhados com `.cursor/rules/backend-official-production.mdc`.

**Classificação:** **SAFE** — PM2 não usa o espelho removido do índice.

**WARNING:** no disco, `backend/src/server.js` está **ausente** no momento da auditoria (ver `SERVER_ENTRYPOINT_INTEGRITY.md`). O processo pode estar online por uptime anterior; **restart PM2 falhará** até restaurar o ficheiro.
