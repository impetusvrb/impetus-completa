# SILENT FAILURE INVENTORY — Escopo Administrativo

**Auditoria:** FIX-003/004 — SILENT FAILURE RECOVERY  
**Data:** 2026-07-13  
**Escopo:** `frontend/src/pages/Admin*.jsx`, `pages/admin/`, `domains/admin/`  
**Método:** Busca estática pós-correção

---

## Resumo

| Métrica | Valor |
|---------|-------|
| Targets corrigidos nesta missão | 2 (SF-005/006) |
| Silent catches removidos (acumulado FIX-003/004 + SF-005/006) | 4 |
| Descobertos adicionais (FIX-003/004) | 5 |
| Pendentes após SF-005/006 | 3 (SF-001 a SF-004) |
| Auto-fix adicional | 0 |

---

## Corrigidos (FIX-003/004 + SF-005/006)

| Módulo | Arquivo | Linha (pré) | Operação | Status |
|--------|---------|-------------|----------|--------|
| AdminAuditLogs | `AdminAuditLogs.jsx` | 58 | `getStats(7)` | **FIXED** (FIX-003) |
| AdminEquipmentLibrary | `AdminEquipmentLibrary.jsx` | 43 | `references()` | **FIXED** (FIX-004) |
| AdminLogistics | `AdminLogistics.jsx` | 77-78 | `loadReferences()` | **FIXED** (SF-005) |
| AdminWarehouse | `AdminWarehouse.jsx` | 71-72 | `loadReferences()` | **FIXED** (SF-006) |

---

## Descobertos — NOT_AUTO_FIXED

| ID | Módulo | Arquivo | Linha | Padrão | Operação | Classificação | Acção |
|----|--------|---------|-------|--------|----------|---------------|-------|
| SF-001 | AdminIntegrations | `AdminIntegrations.jsx` | 171 | `catch {}` | `clipboard.writeText` | OPTIONAL_FAILURE | Inventário — feedback copy (FIX-011) |
| SF-002 | AdminOperationalTeams | `AdminOperationalTeams.jsx` | 72 | `catch (_)` | Carregamento auxiliar | RECOVERABLE_FAILURE | Inventário — revisão futura |
| SF-003 | AdminOperationalTeams | `AdminOperationalTeams.jsx` | 97 | `catch (_) {}` | Operação secundária | RECOVERABLE_FAILURE | Inventário |
| SF-004 | AdminStructural | `AdminStructural.jsx` | 1043 | `catch (_)` | Handler estrutural | RECOVERABLE_FAILURE | Inventário — subform complexo |

---

## Corrigidos nesta fase (SF-005/006) — removidos de NOT_AUTO_FIXED

| ID | Módulo | Evidência |
|----|--------|-----------|
| SF-005 | AdminLogistics | `SF_006_LOGISTICS_REFERENCE_FAILURE_RECOVERY.md` |
| SF-006 | AdminWarehouse | `SF_005_WAREHOUSE_REFERENCE_FAILURE_RECOVERY.md` |

---

## Fora de escopo (intencional)

| Arquivo | Padrão | Motivo |
|---------|--------|--------|
| `AdminAuditLogs.jsx` L22-24 | `catch` em `safePayloadPreview` | Serialização JSON — fallback string seguro |
| `AdminIntegrations.jsx` clipboard | Browser API — falha silenciosa aceitável para OPTIONAL |

---

## Padrão canónico estabelecido (referência)

```
1. resolveAdminApiError(e, fallback) — mensagem segura
2. Estado error dedicado (loadError, statsError, refsError)
3. Banner impetus-card / mono — erro vs warn
4. notify.error — toast imediato (OPERATIONAL_FAILURE)
5. Botão retry — sem reload página
6. emptyMessage explícito — NO_* vs *_LOAD_FAILED
7. Sem console.log de payload / JWT / secrets
8. Sem logging adicional em disco
```

---

## Priorização futura

| ID | Prioridade sugerida |
|----|---------------------|
| SF-002, SF-003 | P3 — equipes operacionais |
| SF-004 | P3 — structural subform |
| SF-001 | P3 — já em PENDING_FIXES FIX-011 |

---

*Inventário read-only excepto targets FIX-003/004.*
