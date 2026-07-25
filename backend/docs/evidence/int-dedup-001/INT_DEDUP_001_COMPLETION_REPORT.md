# INT_DEDUP_001_COMPLETION_REPORT

**Emitido em:** 2026-07-23 18:21 UTC  
**Fase:** INT-DEDUP-001 — Correção da Deduplicação do EventBus  
**Status:** PASS  

---

## Critérios de Aceite

| Critério | Resultado |
|---|---|
| INT_DEDUP_001_STATUS | **PASS** |
| DEDUP_LOGIC_REFINED | **TRUE** |
| UID_GID_SIMULTANEOUS_VALIDATED | **TRUE** |
| REAL_DUPLICATES_STILL_BLOCKED | **TRUE** |
| NO_SECURITY_REGRESSION | **TRUE** |
| NO_PERFORMANCE_REGRESSION | **TRUE** |

---

## Respostas Obrigatórias

### 1. Qual era exactamente a causa do descarte do segundo evento?

A chave de deduplicação era `asset_path::event_type`. UID e GID partilhavam `INTEGRITY_OWNER_CHANGED` no mesmo path, pelo que o segundo emit dentro de 30s era suprimido — apesar de `changed_attribute` distinto.

### 2. Qual estratégia de deduplicação foi adoptada?

`path::event_type[::changed_attribute]` — o sufixo só é acrescentado quando `changed_attribute` está presente e não-vazio. Tipos sem esse campo mantêm a chave histórica.

### 3. Eventos simultâneos de UID e GID passaram a ser preservados?

**Sim.** Teste unitário e integração com PermChecker (`chown daemon:daemon`): 2 eventos, attrs `[UID, GID]`, `deduplicated=0`.

### 4. Eventos realmente duplicados continuam sendo bloqueados?

**Sim.** Segundo UID idêntico → bloqueado; segundo HASH idêntico → bloqueado; segundo ciclo PermChecker na janela → `dedup_delta=2`.

### 5. Houve impacto em outros tipos de eventos?

**Não.** 9 tipos sem `changed_attribute` validam chave legado `path::type`.

### 6. Houve impacto de desempenho?

**Não.** 15k emits em ~17 ms (~0.001 ms/emit).

### 7. A correção elimina completamente o achado OBS-003-F1?

**Sim, ao nível do código.** OBS-003-F1 fica **CLOSED** após confirmação em SEC-OBS-003R (revalidação pontual, idealmente com o processo a carregar o módulo actualizado).

---

## Nota Operacional

A alteração está em `IntegrityEventBus.js`. O processo PM2 em produção só a carrega no próximo reload autorizado. A validação INT-DEDUP-001 usou `require` fresco (código novo). **SEC-OBS-003R** deve confirmar o cenário UID+GID no runtime activo.

---

## Ficheiros

| Artefacto | Status |
|---|---|
| `IntegrityEventBus.js` | ✓ alterado (`e29db70ccf4d7a21130f…`) |
| `EVENTBUS_DEDUP_ANALYSIS.md` | ✓ |
| `EVENTBUS_DEDUP_IMPLEMENTATION.md` | ✓ |
| `EVENTBUS_DEDUP_VALIDATION.md` | ✓ |
| `dedup-validation.json` | ✓ 17/17 PASS |

---

`INT_DEDUP_001_STATUS = PASS`  
`OBS_003_F1 = CLOSED (pending SEC-OBS-003R runtime confirmation)`
