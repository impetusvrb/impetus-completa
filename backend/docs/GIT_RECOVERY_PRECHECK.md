# GIT_RECOVERY_PRECHECK

**FASE:** GIT-RECOVERY-03 — Etapa 03-A  
**Data:** 2026-06-04  
**Modo:** READ → VALIDATE → BACKUP → RESTORE → VERIFY

---

## Git

| Campo | Valor |
|-------|-------|
| Branch | `main` |
| HEAD | `7ea6cb2b8d23de4b57ffdf66261d5e9a4469dd11` |
| origin/main | `7ea6cb2b8d23de4b57ffdf66261d5e9a4469dd11` (alinhado) |

---

## PM2 (pré-restauração)

| Processo | Status | Uptime | Script / CWD |
|----------|--------|--------|----------------|
| impetus-backend | online | ~16h | `/var/www/impetus-completa/backend/src/server.js` |
| impetus-frontend | online | ~16h | `npm run preview:prod` em `/var/www/impetus-completa/frontend` |

**Nota:** `backend/src/server.js` **ausente no disco** antes da restauração; processo em memória desde arranque 2026-06-03 22:54 UTC.

---

## Working tree (pré-restauração)

| Estado | Quantidade |
|--------|------------|
| **D** (deleted vs HEAD) | 214 |
| **M** (modified) | 2 |
| **??** (untracked) | 42 |

## Ficheiros oficiais ausentes (backend/src + frontend/src)

| Métrica | Valor |
|---------|-------|
| Em Git, ausentes no disco | **195** |
| backend/src | 59 |
| frontend/src | 136 |

---

## Alterações locais a preservar (FASE 47.5)

| Ficheiro | Estado | Backup |
|----------|--------|--------|
| `backend/src/services/executiveMode.js` | M (+35 linhas diff) | `backend/backups/git-recovery-03/executiveMode.js.backup` |
| `backend/src/services/impetusVoiceChatService.js` | M (+24 linhas diff) | `backend/backups/git-recovery-03/impetusVoiceChatService.js.backup` |

Ambos adicionam `applyCognitiveTextTruth` via `cognitiveTruthClosureService`.

---

## Veredito pré-check

**GO** para Etapa 03-D — fonte de restauração: **HEAD** (não `impetus_complete/`).
