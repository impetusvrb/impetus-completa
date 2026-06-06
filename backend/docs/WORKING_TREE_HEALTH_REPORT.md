# WORKING_TREE_HEALTH_REPORT

**FASE:** GIT-AUDIT-01  
**Data:** 2026-06-04  
**Modo:** READ ONLY  
**Branch:** `main` (alinhada com `origin/main` @ `7ea6cb2b8`)  
**Comando:** `git status --short`

---

## Contagens

| Estado | Quantidade | Significado |
|--------|------------|-------------|
| **D** (deleted) | 214 | No Git (HEAD) mas **ausentes** no working tree |
| **M** (modified) | 2 | Alterados vs HEAD |
| **??** (untracked) | 35 | Novos, não versionados |
| **Total linhas** | ~251 | |

---

## Arquivos modificados (M)

| Path | Nota |
|------|------|
| `backend/src/services/executiveMode.js` | Alteração local pendente |
| `backend/src/services/impetusVoiceChatService.js` | Alteração local pendente |

---

## Arquivos deletados (D) — amostra crítica

Grupo **backend oficial** (presentes em `HEAD`, ausentes no disco):

- `backend/src/server.js`
- `backend/src/routes/dashboard.js`, `anam.js`, `admin/structural.js`, …
- `backend/src/services/chatAIService.consolidated.js`, `claudePanelService.js`, …
- `backend/.env.example`
- dezenas de docs e módulos cognitivos

Grupo **frontend oficial**:

- `frontend/src/App.jsx`, `main.jsx`, `Layout.jsx`
- `frontend/vite.config.js`, `.env.production`
- features dashboard, smart panel, voice, charts, …

Grupo **outros**:

- `.cursor/rules/charts-real-data-industrial.mdc`

**Causa provável:** eliminação acidental ou sincronização incompleta do working tree — **independente** do conteúdo do commit `7ea6cb2b8` (que não tocou estes paths).

---

## Arquivos untracked (??) — amostra

- `backend/docs/*` — relatórios novos (Gemini, PM2 recovery, stress test, truth closure, …)
- `backend/scripts/gemini-live-ping.js`, `phase48-operational-truth-stress-test.js`
- `scripts/` (ex.: `git-ignore-setup-and-cache-clean.sh`)

**Nota:** `node_modules/`, `deploy_backups/`, `.env.edge-agent` **não** aparecem em massa no status — `.gitignore` eficaz.

---

## Classificação do working tree

| Nível | Motivo |
|-------|--------|
| **CRITICAL** | 214 ficheiros oficiais em `D` — árvore de trabalho não representa `HEAD` |
| **WARNING** | 2 ficheiros `M` não commitados; 35 untracked (docs/scripts) |

**Relação com push `7ea6cb2b8`:** o remoto está correto para esse commit; o problema é **local** (disco vs Git).
