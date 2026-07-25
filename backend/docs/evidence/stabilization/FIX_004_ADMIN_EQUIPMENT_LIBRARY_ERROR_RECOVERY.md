# FIX-004 — Admin Equipment Library — Error Recovery

**Data:** 2026-07-13  
**Missão:** SILENT FAILURE RECOVERY (FIX-003/004)  
**Módulo:** `frontend/src/pages/AdminEquipmentLibrary.jsx`

---

## Critérios de aceite

```
FIX_004_STATUS              = PASS
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
| 1 | 43 | `loadRefs` | `equipmentLibraryAdmin.references()` | `GET /admin/equipment-library/references` | **RECOVERABLE_FAILURE** |

**Total no módulo:** 1 silent catch

---

## 2. O que o catch escondia

| Falha | Comportamento anterior | Risco |
|-------|------------------------|-------|
| References API falha | `refs` permanece `null` — dropdowns 3D usam fallback `assets` | Metadados (departamentos, linhas) ausentes sem aviso |
| loadAll falha (já tinha notify) | Toast + tabelas vazias "Nenhum equipamento" | **FALSE_EMPTY_STATE** — LIBRARY_EMPTY vs LIBRARY_LOAD_FAILED |

---

## 3. Padrão canónico reutilizado

| Padrão | Fonte |
|--------|-------|
| `resolveAdminApiError` | AdminAuditLogs (mesma missão), AdminUsers |
| `loadError` + banner bloqueante | AdminAudioLogs |
| `refsError` + banner warn | Stats warn AdminAuditLogs — falha não bloqueia CRUD principal se loadAll OK |
| `notify.error` + retry | RolloutCenterHub, AdminIntegrations |

---

## 4. Correção aplicada

| Alteração | Detalhe |
|-----------|---------|
| `loadRefs()` | async/await — `refsError` state + retry "Recarregar metadados" |
| `loadAll()` | `loadError` state — limpa arrays em falha |
| `retryAll()` | Recarrega refs + dados principais |
| Tabs | Ocultas quando `loadError` — evita tabelas vazias enganosas |
| Empty messages | Sufixo `(LIBRARY_EMPTY)` explícito |
| CSS | `.eq-lib-banner--error`, `--warn` |

---

## 5. Estados diferenciados

| Estado | UI |
|--------|-----|
| `LIBRARY_EMPTY` | Tabela vazia com mensagem explícita |
| `LIBRARY_LOAD_FAILED` | Banner erro — tabs ocultas, retry |
| Refs indisponíveis | Banner âmbar — biblioteca principal pode funcionar |

---

## 6. Retry

| Fluxo | Botão |
|-------|-------|
| Falha principal | "Tentar novamente" → `retryAll()` |
| Falha refs only | "Recarregar metadados" → `loadRefs()` |

---

## 7. Ficheiros alterados

- `frontend/src/pages/AdminEquipmentLibrary.jsx`
- `frontend/src/pages/AdminEquipmentLibrary.css`

---

## 8. Regressão

| Cenário | Esperado |
|---------|----------|
| API OK, biblioteca vazia | Tabelas + LIBRARY_EMPTY |
| API loadAll falha | Banner LIBRARY_LOAD_FAILED |
| API refs falha, loadAll OK | Banner warn + tabelas funcionais |
| Upload/ações CRUD | Inalterados |

---

*Forense intacta — sem alterações em storage-remediation.*
