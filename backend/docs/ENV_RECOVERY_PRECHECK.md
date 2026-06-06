# ENV_RECOVERY_PRECHECK

**FASE:** ENV-RECOVERY-03 — Etapa 03-A  
**Data:** 2026-06-04  
**Modo:** Inventário pré-recuperação

---

## Git

| Campo | Valor |
|-------|--------|
| **Branch** | `main` |
| **HEAD** | `7ea6cb2b8d23de4b57ffdf66261d5e9a4469dd11` |
| **Estado** | Working tree com `D` docs/cursor, `M` F47.5 (`executiveMode.js`, `impetusVoiceChatService.js`), relatórios forenses `??` — **sem alteração de código nesta fase** |

---

## PM2 — `impetus-backend`

| Campo | Valor |
|-------|--------|
| **Status** | online |
| **Uptime** | ~93m (no momento do precheck) |
| **Restarts** | 351 |
| **Unstable restarts** | 0 |
| **Script** | `/var/www/impetus-completa/backend/src/server.js` |
| **Created at** | 2026-06-04T15:46:12.038Z (reload GIT-RECOVERY-03) |

---

## Existência de ficheiros de ambiente

| Path | Existe? | Última alteração (UTC) | Tamanho |
|------|---------|------------------------|---------|
| `backend/.env` | **Não** | — | — |
| `backend/.env.bkp.20260508_185602` | **Sim** | 2026-05-08 13:24 | 6 775 B |
| `backups/recovery_20260603_225426/backend.env` | **Sim** | 2026-06-03 22:54 | 42 082 B |
| `deploy_backups/20260601_2259/.env` | **Sim** | 2026-06-01 12:48 | 41 825 B |

Outros `backend/.env.bkp.*`: apenas o de 2026-05-08 listado.

---

## Contexto forense (ENV_FORENSIC_02 / LOGIN_FORENSIC_01)

- Runtime actual: credencial PostgreSQL via **PM2** (variante inválida → `28P01`).
- `backend/.env` ausente impede `dotenv` override em `db/index.js`.
- Backup Truth Deploy **2026-06-03 22:54** documentado em `PM2_RECOVERY_BACKUP_REPORT.md`.

---

## Backup mais recente validado

| Prioridade | Fonte | Justificação |
|------------|--------|--------------|
| **1 (canónico para restore)** | `backups/recovery_20260603_225426/backend.env` | Mais recente; capturado no `pm2 save` Truth Deploy; alinhado com estado operacional de 2026-06-03 |
| 2 (referência) | `backend/.env.bkp.20260508_185602` | Antigo; hashes DB_* equivalentes ao recovery (validação 03-B) |
| 3 (não usar nesta fase) | `deploy_backups/20260601_2259/.env` | Anterior ao recovery Truth; não validado como par com reload 03/06 |

**Resposta:** O backup mais recente **validado** para recuperação é **`backups/recovery_20260603_225426/backend.env`**.

---

## Veredito Etapa 03-A

**PRECHECK_PASS** — Prosseguir para validação de backup (03-B).
