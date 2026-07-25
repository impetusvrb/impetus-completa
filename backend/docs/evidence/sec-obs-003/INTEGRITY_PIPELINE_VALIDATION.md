# INTEGRITY_PIPELINE_VALIDATION

**Emitido em:** 2026-07-23 17:42 UTC  
**Fase:** SEC-OBS-003  

---

## 1. Fluxo Validado

```
Detecção (HashChecker / PermChecker / AuditdBridge)
    ↓
IntegrityEventBus  (dedup 30s; chave path::event_type)
    ↓
IntegrityCorrelationEngine
    ↓
IntegrityStateStore (state.json + events.jsonl)
    ↓
Dashboard (getIntegrityState — consumo read-only)
```

---

## 2. Evidências de Pipeline

| Etapa | Evidência | Status |
|---|---|---|
| EventBus | eventos `integrity_event` emitidos nos cenários | ✓ |
| CorrelationEngine | `processed` > 0; `errors=0` | ✓ |
| StateStore | estado isolado + produção `mode=WATCH` | ✓ |
| Dashboard | `getIntegrityState` presente; sem HashChecker/createHash | ✓ |
| Intelligence | `case 'INTEGRITY'` consome StateStore | ✓ |
| Sem perda (cenários isolados) | hash/perm/UID/GID/delete/MEDIUM | ✓ |
| Sem duplicação indevida | UID+GID → 1 evento (dedup intencional) | ver OBS-003-F1 |

---

## 3. Perda vs Duplicação

| Critério | Resultado | Nota |
|---|---|---|
| Duplicação de eventos | Não observada | Dedup activo |
| Perda em cenários isolados | Não | — |
| Perda UID+GID simultâneo | **Sim (1 atributo)** | OBS-003-F1 |

---

## 4. Desacoplamento Dashboard

Confirmado por análise estática:
- Dashboard **não** executa hashes
- Dashboard **não** importa IntegrityHashChecker
- Consumo exclusivo via `IntegrityStateStore.readStateFile()` / `getIntegrityState()`

`PIPELINE_VALIDATED = TRUE` (com observação OBS-003-F1)
