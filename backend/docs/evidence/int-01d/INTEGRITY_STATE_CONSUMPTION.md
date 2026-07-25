# INTEGRITY_STATE_CONSUMPTION.md
## INT-01D — Validação do Consumo de Estado

**Fase:** INT-01D  
**Data:** 2026-07-23  
**Status:** PASS — 25/25 testes

---

## 1. API de Consumo Oficial

### `IntegrityStateStore.readStateFile()` (static)

Método de leitura canónico, sem efeitos secundários:

**Input:** Nenhum (lê `INTEGRITY_STATE_DIR/state.json`)

**Output (estado disponível):**
```json
{
  "schema_version": "1.0",
  "sensor_active": true,
  "mode": "WATCH",
  "ok": true,
  "violations": 0,
  "assets_monitored": 33,
  "baseline_id": "INT-01A-BASELINE-20260720",
  "last_check": "2026-07-23T14:08:57.000Z",
  "stats": { "events_produced": 5, "events_suppressed": 0, "events_persisted": 5 },
  "metrics": { "avg_hash_ms": 0.8, "heap_mb": 4.28, "queue_size": 0 },
  "last_error": null
}
```

**Output (falha/indisponível):**
```json
{ "sensor_active": false, "reason": "state_file_missing" }
{ "sensor_active": false, "error": true }
{ "...": "...", "sensor_active": false, "stale": true }
```

### `getIntegrityState()` (Dashboard Service)

Wrapper normalizado para o Dashboard. Nunca lança excepção — garante fallback gracioso em qualquer condição.

**Campos retornados (available=true):**

| Campo | Tipo | Descrição |
|---|---|---|
| `available` | boolean | Estado disponível e válido |
| `sensor_active` | boolean | Motor activo |
| `mode` | string | WATCH / DEGRADED / STOPPED |
| `ok` | boolean | Sistema íntegro |
| `violations` | integer | Violações acumuladas |
| `violations_last_24h` | integer | Violações últimas 24h |
| `assets_monitored` | integer | Activos sob vigilância |
| `baseline_id` | string | Identificador do baseline |
| `last_check` | ISO timestamp | Última actualização do motor |
| `stats` | object | Estatísticas do motor |
| `metrics` | object | Métricas de desempenho |
| `last_error` | string\|null | Último erro registado |
| `read_ms` | number | Latência de leitura (observabilidade) |

---

## 2. Resultados dos Testes de Consumo

### FASE 4A — Feature flag desligada

| Teste | Status |
|---|---|
| Flag desligada → available=false | ✅ PASS |
| reason=sensor_disabled | ✅ PASS |

**Verificado:** Quando `INTEGRITY_SENSOR_ENABLED=false`, `getIntegrityState()` retorna imediatamente `available: false` sem tentar ler o state.json. Fallback na Intelligence activo.

### FASE 4B — Flag ligada, estado disponível

| Teste | Status |
|---|---|
| available=true com estado real | ✅ PASS |
| mode=WATCH consumido | ✅ PASS |
| assets_monitored=33 preservado | ✅ PASS |
| violations=0 (sistema íntegro) | ✅ PASS |
| baseline_id correcto | ✅ PASS |
| read_ms registado (observabilidade) | ✅ PASS |

### FASE 4C — Violações activas propagadas

| Teste | Status |
|---|---|
| violations=2 consumidos | ✅ PASS |
| ok=false reflectido | ✅ PASS |

### FASE 5A — Fallback: state.json ausente

| Teste | Status |
|---|---|
| state.json ausente → available=false | ✅ PASS |

**Verificado:** `readStateFile()` retorna `{ sensor_active: false, reason: 'state_file_missing' }`. `getIntegrityState()` detecta `!raw.sensor_active` e activa fallback. **A aplicação não degrada.**

### FASE 5B — Fallback na Intelligence Layer

| Teste | Status |
|---|---|
| Intelligence usa proxy fail2ban quando motor indisponível | ✅ PASS |

### FASE 5C — Estado DEGRADED propagado

| Teste | Status |
|---|---|
| mode=DEGRADED consumido | ✅ PASS |
| last_error preenchido | ✅ PASS |

### FASE 6 — Consistência entre leituras

| Teste | Status |
|---|---|
| 5 leituras consecutivas: mode consistente | ✅ PASS |
| 5 leituras consecutivas: violations consistente | ✅ PASS |

### FASE 6B — Corrupção do state.json

| Teste | Status |
|---|---|
| state.json corrompido → available=false | ✅ PASS |

**Verificado:** JSON inválido em state.json provoca excepção em `JSON.parse()`. `readStateFile()` captura e retorna `{ sensor_active: false, error: true }`. `getIntegrityState()` activa fallback graciosamente.

---

## 3. Separação de Lógica Verificada

| Verificação | Dashboard | Intelligence |
|---|---|---|
| IntegrityHashChecker importado | ❌ Não | ❌ Não |
| IntegrityPermChecker importado | ❌ Não | ❌ Não |
| IntegrityAuditdBridge importado | ❌ Não | ❌ Não |
| IntegrityCorrelationEngine importado | ❌ Não | ❌ Não |
| IntegrityEngine importado | ❌ Não | ❌ Não |
| sha256/createHash chamado | ❌ Não | ❌ Não |
| **Único ponto de entrada** | ✅ `IntegrityStateStore.readStateFile()` | ✅ `IntegrityStateStore.readStateFile()` |

**NO_BUSINESS_LOGIC_IN_DASHBOARD = TRUE** (confirmado por análise estática do código)

---

**STATE_CONSUMPTION_VALIDATED = TRUE**
