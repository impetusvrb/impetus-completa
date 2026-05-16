# Enterprise Final Restart — Backup Report

**Timestamp (UTC):** 2026-05-16T17:36:55Z  
**Backup directory:** `backend/backups/enterprise-final-restart-20260516_173655/`  
**Git commit:** `51e9c93aef0acf36ac5c0a07161b8d9d5d2df677`  
**Mensagem:** Governança enterprise: migrations blindadas, tenant admin, políticas cognitivas e isolamento admin/operacional.

---

## Runtime status (pré-restart)

| Processo | PID | Status | Uptime | Restarts | Memória |
|----------|-----|--------|--------|----------|---------|
| impetus-backend | 3099507 | online | ~17h | 120 | ~108 MB |
| impetus-frontend | 3099534 | online | ~17h | 63 | ~63 MB |
| lipsync-api | 766 | online | 37d | 0 | ~27 MB |

## Health endpoints (pré-restart)

| Endpoint | HTTP |
|----------|------|
| `GET http://127.0.0.1:4000/health` | 200 |
| `GET http://127.0.0.1:3000/` | 200 |

## Portas

- Backend: `4000`
- Frontend (serveDist): `3000`
- nginx: `80`
- PostgreSQL: `127.0.0.1:5432`

## Conteúdo do backup

| Artefacto | Local no backup |
|-----------|-----------------|
| `backend/.env` (cópia) | `backend.env` |
| `backend/package.json` | `package.json` |
| `frontend/package.json` | `frontend-package.json` |
| PM2 jlist + dump | `pm2/` |
| PM2 describe backend/frontend | `pm2/describe-*.txt` |
| Frontend dist tarball | `frontend-dist/dist.tar.gz` (~62 MB) |
| Logs PM2 (tail) | `logs/` |
| Flags (nomes apenas, valores redigidos) | `flags/env-keys-snapshot.txt`, `flags/enterprise-flag-names.txt` |
| Health snapshot | `health/` |
| Migration status + dry-run | `migrations/` |
| Schema colunas críticas | `schema/critical-tables-columns.json` |
| Relatórios enterprise/quality | `reports/` |
| Git HEAD | `git/HEAD`, `git/last-commit.txt` |

**Nota:** `ecosystem.config.js` não existe no repositório; PM2 gerido por nome (`impetus-backend`, `impetus-frontend`).

## Migrations (pré-restart)

- Histórico: **87** migrations `success` em `impetus_migration_history`
- Dry-run: **1** pendente (`impetus_quality_universal_runtime_migration.sql`, categoria `safe`)
- Rollbacks ignorados: **3** ficheiros em `_rollback/`
- Destrutivas bloqueadas: **0**

## Flags relevantes (snapshot de nomes — sem valores)

Chaves `IMPETUS_*` documentadas em `flags/`. Valores sensíveis **não** copiados em claro no relatório.

## Rollback instructions

1. **Frontend dist:**  
   `cd /var/www/impetus-completa/frontend && rm -rf dist && tar -xzf ../backend/backups/enterprise-final-restart-20260516_173655/frontend-dist/dist.tar.gz -C .`

2. **Backend .env:**  
   `cp backend/backups/enterprise-final-restart-20260516_173655/backend.env backend/.env`

3. **PM2 (se necessário):**  
   `pm2 resurrect` usando `pm2/dump.pm2` ou reload dos PIDs anteriores via `pm2 describe` guardado.

4. **Git (código):**  
   `git checkout 51e9c93aef0acf36ac5c0a07161b8d9d5d2df677`

5. **Não executar** `tenant_admins_rollback.sql` nem `manuia_rollback.sql` sem `IMPETUS_ALLOW_ROLLBACK=true` e `--yes-i-understand`.

---

*Backup gerado automaticamente antes do Enterprise Controlled Restart.*
