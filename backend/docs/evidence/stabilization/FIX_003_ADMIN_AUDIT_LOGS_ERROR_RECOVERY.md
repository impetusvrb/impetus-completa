# FIX-003 — Admin Audit Logs — Error Recovery

**Data:** 2026-07-13  
**Missão:** SILENT FAILURE RECOVERY (FIX-003/004)  
**Módulo:** `frontend/src/pages/AdminAuditLogs.jsx`

---

## Critérios de aceite

```
FIX_003_STATUS              = PASS
ROOT_CAUSE_IDENTIFIED       = YES
SILENT_CATCH_TARGETS        = 0
FALSE_EMPTY_STATE_RISK      = MITIGATED
USER_ERROR_VISIBILITY       = RESTORED
RETRY_FLOW                  = VALIDATED
SENSITIVE_DATA_LOGGED       = NO
LOG_VOLUME_RISK             = CONTROLLED
```

---

## 1. Silent catches identificados (pré-fix)

| # | Linha | Função | Operação | API | Classificação |
|---|-------|--------|----------|-----|---------------|
| 1 | 58 | `useEffect` mount | `adminLogs.getStats(7)` | `GET /admin/logs/stats/summary` | **USER_VISIBLE_FAILURE** (KPIs ausentes silenciosamente) |

**Total no módulo:** 1 silent catch

---

## 2. O que o catch escondia

| Falha | Comportamento anterior | Risco |
|-------|------------------------|-------|
| Stats API falha | Cards KPI (7d, críticos, 24h) **não aparecem** — sem mensagem | Operador assume zero eventos ou UI incompleta |
| Logs API falha (já tinha notify) | Toast + tabela vazia com "Nenhum log" | **FALSE_EMPTY_STATE** — confundir falha com NO_AUDIT_EVENTS |

---

## 3. Intenção / padrão canónico reutilizado

| Padrão | Fonte |
|--------|-------|
| `resolveAdminApiError(e, fallback)` | Inline — `e.apiMessage \|\| e.response?.data?.error \|\| e.message` (AdminUsers, AdminAudioLogs, RolloutCenterHub) |
| Estado `error` + banner | `AdminAudioLogs.jsx` |
| Toast `notify.error` | `NotificationContext` — mantido para feedback imediato |
| Retry button | `AdminAudioLogs`, RolloutCenterHub |

**Não criado** novo sistema de telemetria ou logging em disco.

---

## 4. Correção aplicada

| Alteração | Detalhe |
|-----------|---------|
| `loadStats()` | `useCallback` async — substitui `.catch(() => {})` |
| `statsError` state | Banner âmbar + retry — stats são **suplementares** (RECOVERABLE) |
| `logsLoadError` state | Banner vermelho + retry — bloqueia tabela falsa vazia |
| `loadLogs()` | `useCallback` — limpa logs em falha, define `AUDIT_DATA_LOAD_FAILED` |
| Empty message | `"Nenhum registro… (NO_AUDIT_EVENTS)"` — distinto de erro |
| CSS | `.admin-logs-banner--error`, `--warn` |

---

## 5. Estados diferenciados

| Estado | UI |
|--------|-----|
| `NO_AUDIT_EVENTS` | Tabela vazia com mensagem explícita |
| `AUDIT_DATA_LOAD_FAILED` | Banner erro + botão "Tentar novamente" — **sem tabela** |
| `AUDIT_STATS_LOAD_FAILED` | Banner âmbar — tabela principal continua funcional |

---

## 6. Retry

| Fluxo | Implementação |
|-------|---------------|
| Stats | Botão "Tentar novamente" → `loadStats()` |
| Logs | Botão "Tentar novamente" → `loadLogs()` |
| AI traces | Já existia — `loadAiTraces()` + botão Atualizar |

---

## 7. Ficheiros alterados

- `frontend/src/pages/AdminAuditLogs.jsx`
- `frontend/src/pages/AdminAuditLogs.css`

---

## 8. Regressão

| Cenário | Esperado |
|---------|----------|
| API OK, logs vazios | Tabela + NO_AUDIT_EVENTS |
| API logs falha | Banner AUDIT_DATA_LOAD_FAILED, sem tabela |
| API stats falha | Banner warn, logs normais |
| Retry após falha | Recarrega sem reload página |
| Tab AI | Inalterado — já tinha error handling |

---

*Forense intacta — sem alterações em storage-remediation.*
