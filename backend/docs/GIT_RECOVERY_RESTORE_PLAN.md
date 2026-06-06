# GIT_RECOVERY_RESTORE_PLAN

**FASE:** GIT-RECOVERY-03 — Etapa 03-C (simulação — sem restore executado neste doc)  
**Fonte autorizada:** `HEAD` @ `7ea6cb2b8`  
**Fonte proibida:** `impetus_complete/`

---

## Comando planeado

```bash
git checkout HEAD -- backend/src frontend/src
```

Seguido de reaplicação dos backups F47.5:

```bash
cp backend/backups/git-recovery-03/executiveMode.js.backup backend/src/services/executiveMode.js
cp backend/backups/git-recovery-03/impetusVoiceChatService.js.backup backend/src/services/impetusVoiceChatService.js
```

---

## `git diff --name-status HEAD` (resumo)

| Tipo | Total linhas | Oficial (src) |
|------|--------------|---------------|
| D | 214 | 195 em `backend/src` + `frontend/src` |
| M | 2 | `executiveMode.js`, `impetusVoiceChatService.js` |
| (outros D) | 19 | docs, `.cursor/rules`, `.env.example` — **fora** do scope checkout |

---

## Backend ausentes (59 paths — amostra crítica)

- `backend/src/server.js`
- `backend/src/routes/dashboard.js`, `anam.js`, `admin/structural.js`, `admin/users.js`
- `backend/src/services/chatAIService.consolidated.js`, `claudePanelService.js`, `smartPanelCommandService.js`, …
- `backend/src/middleware/globalRateLimit.js`
- `backend/src/eventPipeline/dlq/industrialDlqService.js`, …

## Frontend ausentes (136 paths — amostra crítica)

- `frontend/src/App.jsx`, `main.jsx`, `vite.config.js`
- `frontend/src/features/dashboard/**` (CentroComando, cognitive ecosystem)
- `frontend/src/features/smartPanel/**`
- `frontend/src/voice/**`, `hooks/useVoiceEngine.js`, `services/api.js`

---

## Total estimado

| Métrica | Valor |
|---------|-------|
| Paths a restaurar (checkout) | **~195** (todos em backend/src + frontend/src) |
| + dependências já no disco | milhares de outros `.js` mantidos |
| Ficheiros M sobrescritos pelo checkout | 2 → **reaplicados via backup** |

---

## Impacto esperado

| Área | Impacto |
|------|---------|
| Disco | Repõe entrypoint, rotas, UI, serviços cognitivos |
| Git status `D` em src | Redução de **195** para **0** (nos paths restaurados) |
| FASE 47.5 | Preservada via backup pós-checkout |
| FASE 48 | Scripts/docs `??` intactos; `phase48-operational-truth-stress-test.js` não tocado |
| PM2 | Requer reload após validação de ficheiros |
| impetus_complete | **Não utilizado** |

---

## Riscos mitigados

- Proibido: `reset --hard`, `clean`, rollback `7ea6cb2b8`
- Backup local antes de checkout
- Sem cópia de espelho legado
