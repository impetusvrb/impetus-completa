# EVENTBUS_DEDUP_ANALYSIS

**Emitido em:** 2026-07-23 18:21 UTC  
**Fase:** INT-DEDUP-001  
**Achado de origem:** OBS-003-F1 (SEC-OBS-003)

---

## 1. Causa Raiz

| Campo | Valor |
|---|---|
| Componente | `IntegrityEventBus.emit()` |
| Chave anterior | `asset_path::event_type` |
| Janela | 30 segundos |
| Sintoma | Segundo `INTEGRITY_OWNER_CHANGED` no mesmo path descartado |

Quando o `IntegrityPermChecker` (INT-LIM-003) emite UID e GID no mesmo ciclo:

```
emit(OWNER_CHANGED, changed_attribute=UID)  → aceite
emit(OWNER_CHANGED, changed_attribute=GID)  → deduplicado (mesma chave path::OWNER_CHANGED)
```

O PermChecker estava correcto; a chave de dedup era demasiado grosseira.

---

## 2. Inventário de Tipos de Evento

| Tipo | Origem | Tem `changed_attribute`? | Impacto se chave refinada |
|---|---|---|---|
| `INTEGRITY_HASH_CHANGED` | HashChecker / AuditdBridge | Não | Nenhum — chave permanece `path::type` |
| `INTEGRITY_PERM_CHANGED` | PermChecker | Não | Nenhum |
| `INTEGRITY_OWNER_CHANGED` | PermChecker | **Sim (UID/GID)** | **Diferencia UID vs GID** |
| `INTEGRITY_FILE_DELETED` | HashChecker | Não | Nenhum |
| `INTEGRITY_BASELINE_MISSING` | HashChecker | Não | Nenhum |
| `INTEGRITY_ANOMALY` | HashChecker / AuditdBridge | Não | Nenhum |
| `INTEGRITY_CERT_CHANGED` | AuditdBridge | Não | Nenhum |
| `INTEGRITY_SCRIPT_CHANGED` | AuditdBridge | Não | Nenhum |
| `INTEGRITY_ENV_CHANGED` | AuditdBridge | Não | Nenhum |
| `INTEGRITY_SENSOR_DOWN` | Runtime | Não | Nenhum |

---

## 3. Estratégias Avaliadas

| Opção | Prós | Contras | Decisão |
|---|---|---|---|
| A. Novo `event_type` INTEGRITY_GROUP_CHANGED | Semanticamente limpo | Exige alterar CorrelationEngine (fora de escopo) | Rejeitada |
| B. Sempre incluir fingerprint de `detail` | Muito discriminante | Risco de volume excessivo / chaves instáveis | Rejeitada |
| **C. Sufixo opcional `changed_attribute`** | Mínimo; só afecta OWNER; legado intacto | Depende do campo existir | **Adoptada** |

---

## 4. Estratégia Adoptada

```
buildDedupKey(event) =
  path::event_type::changed_attribute   se changed_attribute presente e não-vazio
  path::event_type                      caso contrário
```

**Justificação:** o único tipo que emite atributos semanticamente distintos sob o mesmo `event_type` é `INTEGRITY_OWNER_CHANGED` (UID vs GID). Os restantes tipos mantêm exactamente a chave histórica.
