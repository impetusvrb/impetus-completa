# EVENTBUS_DEDUP_VALIDATION

**Emitido em:** 2026-07-23 18:21 UTC  
**Fase:** INT-DEDUP-001  
**Resultado:** 17/17 PASS

---

## Cenários Executados

| Cenário | Resultado |
|---|---|
| Forma da chave HASH (legado) | PASS |
| Chave OWNER::UID | PASS |
| Chave OWNER::GID | PASS |
| UID ≠ GID | PASS |
| attr vazio → fallback legado | PASS |
| UID isolado | PASS |
| GID isolado | PASS |
| **UID + GID simultâneos** | **PASS** (2 eventos) |
| Duplicado real UID bloqueado | PASS |
| Duplicado real HASH bloqueado | PASS |
| Tipos diferentes mesmo path | PASS |
| Repetição fora da janela 30s | PASS |
| Repetição dentro da janela 30s | PASS |
| PermChecker chown user:group | PASS (UID+GID) |
| PermChecker repeat → 2 dedups | PASS |
| 9 tipos sem attr = chave legado | PASS |
| Performance 15k emits | PASS (17.2 ms total) |

Dados brutos: `dedup-validation.json`.

---

## Compatibilidade

Tipos sem `changed_attribute` mantêm `path::event_type` — comportamento idêntico ao pré-INT-DEDUP-001.

## Performance

| Métrica | Valor |
|---|---|
| 15 000 emits | 17.2 ms |
| por emit | ~0.0011 ms |
| emitted / deduplicated | 300 / 14700 (dedup continua a actuar) |
