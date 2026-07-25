# GID_VALIDATION_REPORT

**Emitido em:** 2026-07-23 17:05 UTC  
**Fase:** INT-LIM-003  

---

## Resultados dos Testes Funcionais

### Cenário 1 — Estado normal (sem violações)

| Campo | Valor |
|---|---|
| Acção | Nenhuma |
| Eventos esperados | 0 |
| Eventos recebidos | 0 |
| **PASS** | ✓ |

### Cenário 2 — Alteração de GID (chgrp daemon)

| Campo | Valor |
|---|---|
| Acção | `chgrp daemon /tmp/test-file` |
| Evento detectado | `INTEGRITY_OWNER_CHANGED` |
| `changed_attribute` | `GID` |
| `group_previous` | `root` |
| `group_current` | `gid:1` |
| `severity` | `CRITICAL` |
| `asset_criticality` | `CRITICAL` |
| `detail` | `group alterado: esperado=root(gid=0) actual=gid:1` |
| Eventos totais | 1 |
| **PASS** | ✓ |

### Cenário 3 — Restaurar GID

| Campo | Valor |
|---|---|
| Acção | `chgrp root /tmp/test-file` |
| Eventos esperados | 0 (estado baseline restaurado) |
| Eventos recebidos | 0 |
| **PASS** | ✓ |

### Cenário 4 — Alteração de UID (chown daemon)

| Campo | Valor |
|---|---|
| Acção | `chown daemon:root /tmp/test-file` |
| Evento detectado | `INTEGRITY_OWNER_CHANGED` |
| `changed_attribute` | `UID` |
| `owner_previous` | `root` |
| `owner_current` | `uid:1` |
| Eventos totais | 1 |
| **PASS** | ✓ |

### Cenário 5 — Alteração simultânea UID + GID

| Campo | Valor |
|---|---|
| Acção | `chown daemon:daemon /tmp/test-file` |
| Eventos esperados | 2 (um UID + um GID) |
| Eventos recebidos | 2 |
| UID detectado | ✓ |
| GID detectado | ✓ |
| **PASS** | ✓ |

### Cenário 6 — Permissão alterada (chmod 755)

| Campo | Valor |
|---|---|
| Acção | `chmod 755 /tmp/test-file` |
| Evento detectado | `INTEGRITY_PERM_CHANGED` |
| `perm_previous` | `644` |
| `perm_current` | `755` |
| Compatibilidade retroactiva | ✓ |
| **PASS** | ✓ |

### Cenário 7 — Restauração completa

| Campo | Valor |
|---|---|
| Acção | `chown root:root && chmod 644` |
| Eventos esperados | 0 |
| Eventos recebidos | 0 |
| **PASS** | ✓ |

---

## Sumário

| Métrica | Valor |
|---|---|
| Cenários executados | 7 |
| PASS | 7 |
| FAIL | 0 |
| Checks realizados | 7 `_checkAll()` |
| Violations detectadas | 5 (nas 5 situações de violação) |
| Errors | 0 |

---

## Fluxo de Integração Validado

```
chgrp daemon /file
    ↓ (stat.gid ≠ expectedGid)
IntegrityPermChecker._checkAsset()
    ↓
mockBus.emit(INTEGRITY_OWNER_CHANGED, changed_attribute=GID, severity=CRITICAL)
    ↓ [em produção:]
IntegrityEventBus → IntegrityCorrelationEngine → IntegrityStateStore → Dashboard
```

O fluxo completo até ao Dashboard foi confirmado via análise do código — nenhuma alteração nos componentes intermediários foi necessária.

---

## Distinção Auditável UID vs GID

| Atributo de evento | Alteração UID | Alteração GID |
|---|---|---|
| `event_type` | `INTEGRITY_OWNER_CHANGED` | `INTEGRITY_OWNER_CHANGED` |
| `changed_attribute` | `UID` | `GID` |
| Campo específico | `owner_previous/current` | `group_previous/current` |
| `detail` | `owner alterado: ...` | `group alterado: ...` |
| `severity` | `CRITICAL` | `CRITICAL` |

A distinção permanece completamente auditável através dos campos `changed_attribute`, `group_previous` e `group_current`.
