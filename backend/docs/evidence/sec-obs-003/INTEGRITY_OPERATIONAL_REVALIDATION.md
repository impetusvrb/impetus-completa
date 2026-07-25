# INTEGRITY_OPERATIONAL_REVALIDATION

**Emitido em:** 2026-07-23 17:42 UTC  
**Fase:** SEC-OBS-003 — Revalidação Operacional Completa  
**Tipo:** Validação exclusiva (sem alteração de código / baseline / Dashboard / auditd)

---

## 1. Inicialização (FASE 1)

| Verificação | Resultado |
|---|---|
| Motor activo | ✓ `mode=WATCH`, `sensor_active=true`, `INTEGRITY_SENSOR_ENABLED=true` |
| Baseline carregado | ✓ `IMPETUS-INTEGRITY-BASELINE-v2` |
| SHA-256 baseline v2 | `f9ca52c1c1461b5be4f748f8bee444906d826c73332891b77976736ac1495818` — íntegro |
| Inventário | Actualizado (INT-LIM-002/003) — esperado |
| Componentes (10/10) | ✓ todos presentes |
| PermChecker GID | ✓ `resolveGid` + `changed_attribute: 'GID'` presentes |
| Dashboard sincronizado | ✓ `getIntegrityState` + case INTEGRITY |

### Violations em produção

`violations=2` — **drift legítimo**, não regressão:
- `INT-C-010` — `/etc/audit/rules.d/impetus.rules` (INT-LIM-001)
- `INT-M-003` — `impetus-audit.rules` fonte (INT-LIM-001)

Pendentes de consolidação em **SEC-BASELINE-003**.

---

## 2. Observabilidade Funcional (FASE 2)

| Cenário | Resultado | Evento | Latência |
|---|---|---|---|
| Hash (conteúdo) | **PASS** | `INTEGRITY_HASH_CHANGED` | ~1.1s (incl. mtime) |
| chmod | **PASS** | `INTEGRITY_PERM_CHANGED` | <100ms |
| UID isolado | **PASS** | `OWNER_CHANGED` + `UID` | <100ms |
| GID isolado | **PASS** | `OWNER_CHANGED` + `GID` | <100ms |
| UID+GID simultâneo (mesmo path) | **FAIL*** | apenas `UID` | — |
| GID após UID (path diferente) | **PASS** | `GID` | <100ms |
| Exclusão | **PASS** | `INTEGRITY_FILE_DELETED` | <100ms |
| Restauração limpa | **PASS** | 0 eventos | <100ms |
| Auditd dirs + Bridge | **PASS** | 5 chaves activas | config |
| Activo MEDIUM (hash) | **PASS** | `INTEGRITY_HASH_CHANGED` | <100ms |

\* Finding **OBS-003-F1** — ver §6.

**Capacidades nucleares:** 9/9 PASS (excluindo o cenário de dedup).  
**Total cenários:** 9/10 PASS.

---

## 3. Robustez (FASE 4)

| Verificação | Resultado |
|---|---|
| Eventos fantasmas pós-restauração | 0 — PASS |
| Recuperação após restore | PASS |
| Operação contínua (produção) | `mode=WATCH` estável |
| Drift INT-LIM-001 detectado | ✓ HashChecker a actuar correctamente |

---

## 4. Finding OBS-003-F1

| Campo | Valor |
|---|---|
| ID | OBS-003-F1 |
| Severidade | P2 |
| Título | EventBus dedup suppresses consecutive INTEGRITY_OWNER_CHANGED on same path |
| Impacto | When UID and GID change together on the same asset, GID (or second attribute) event may be lost within 30s window. |
| GID isolado | Funciona |
| UID isolado | Funciona |
| Fix recomendado | Include changed_attribute in EventBus dedup key (additive, minimal) before SEC-CERT-003 |

**Natureza:** interacção entre a decisão INT-LIM-003 (reutilizar `INTEGRITY_OWNER_CHANGED` para GID) e a chave de deduplicação do EventBus (`path::event_type`, 30s). Não é falha do PermChecker.

---

## 5. Conclusão Operacional

Todas as capacidades nucleares da camada INTEGRITY estão **operacionais**.  
Existe **uma inconsistência residual P2** (OBS-003-F1) que deve ser corrigida com patch mínimo no EventBus **antes** da certificação plena.
