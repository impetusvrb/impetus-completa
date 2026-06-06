# CRITICAL_FILE_MISSING_AUDIT

**FASE:** GIT-AUDIT-01  
**Data:** 2026-06-04  
**Modo:** READ ONLY  
**Método:** `comm` entre `git ls-files backend/src frontend/src` e `find` no disco

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Ficheiros em Git (`backend/src` + `frontend/src`) | ~milhares tracked |
| Ficheiros no disco mas **não** no Git | (não contabilizado neste relatório) |
| **Em Git, ausentes no disco** | **195** |

---

## Ficheiros críticos — checklist

| Ficheiro | Em Git (HEAD) | No disco | Criticidade |
|----------|---------------|----------|-------------|
| `backend/src/server.js` | Sim | **Não** | CRITICAL — entrypoint PM2 |
| `backend/package.json` | Sim | **Sim** | OK |
| `backend/src/routes/dashboard.js` | Sim | **Não** | CRITICAL |
| `backend/src/services/chatAIService.consolidated.js` | Sim | **Não** | CRITICAL |
| `frontend/package.json` | Sim | **Sim** | OK |
| `frontend/src/App.jsx` | Sim | **Não** | CRITICAL |
| `frontend/src/main.jsx` | Sim | **Não** | CRITICAL |
| `frontend/vite.config.js` | Sim | **Não** | CRITICAL (build/preview) |

---

## Amostra — backend (ausentes no disco, presentes no Git)

- `backend/src/server.js`
- `backend/src/routes/dashboard.js`, `anam.js`, `admin/structural.js`, `admin/users.js`
- `backend/src/services/chatAIService.js`, `chatAIService.consolidated.js`, `claudePanelService.js`, `smartPanelCommandService.js`
- `backend/src/services/moduleAccessGovernanceEngine.js`, `softwareOperationalSnapshotService.js`
- `backend/src/middleware/globalRateLimit.js`
- `backend/src/eventPipeline/dlq/industrialDlqService.js`, `outbox/industrialOutboxService.js`
- … (lista completa: 195 paths — ver comando abaixo)

```bash
comm -23 \
  <(git ls-files backend/src frontend/src | sort) \
  <(find backend/src frontend/src -type f | sed 's|^\./||' | sort)
```

---

## Amostra — frontend (ausentes no disco, presentes no Git)

- `frontend/src/App.jsx`, `main.jsx`, `Layout.jsx`
- `frontend/vite.config.js`, `.env.production`
- `frontend/src/features/dashboard/**` (CentroComando, cognitive ecosystem, …)
- `frontend/src/features/smartPanel/**`
- `frontend/src/voice/**`, `hooks/useVoiceEngine.js`, `services/api.js`

---

## O que o commit `7ea6cb2b8` **não** removeu do Git

Nenhum dos 195 paths acima foi apagado do **repositório** por `7ea6cb2b8`. O commit só deixou de versionar `impetus_complete/**` (+ `.gitignore` + `.pyc`).

**Conclusão:** ausência no disco = **degradação local do working tree**, recuperável a partir de `HEAD` / `origin/main`.

---

## Classificação

| Nível | Motivo |
|-------|--------|
| **CRITICAL** | 195 ficheiros oficiais missing; inclui entrypoint e rotas core |

**Restauração recomendada (informativo — não executado nesta fase):**

```bash
cd /var/www/impetus-completa
git checkout HEAD -- backend/src frontend/src
# Opcional: .env.example, frontend/.env.production, .cursor/rules se necessário
```

**Rollback do commit `7ea6cb2b8`:** **não necessário** para recuperar estes ficheiros — eles continuam em `HEAD`.
