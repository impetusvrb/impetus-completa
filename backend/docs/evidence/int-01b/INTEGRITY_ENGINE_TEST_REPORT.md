# Motor de Integridade — Relatório de Testes

**Documento:** INTEGRITY_ENGINE_TEST_REPORT.md  
**Missão:** INT-01B (FASE 9)  
**Data:** 2026-07-23  
**Status:** ALL_TESTS_PASS  
**Test Runner:** `backend/src/services/integrity/tests/runTests.js`  
**Execução:** 2026-07-23T13:04:48Z → 2026-07-23T13:04:49Z (< 500ms)

---

## 1. Resultado geral

```
TOTAL_TESTS      = 25
PASSED           = 25
FAILED           = 0
INT_01B_STATUS   = PASS
```

---

## 2. Resultados por fase

### FASE 9.1 — Baseline Manager (6 testes)

| # | Teste | Status |
|---|---|---|
| 1 | Baseline carregado sem erro | ✔ PASS |
| 2 | getAllAssets retorna 35 activos (≥10) | ✔ PASS |
| 3 | 10 activos CRITICAL no baseline | ✔ PASS |
| 4 | getHealth() → baseline_valid=true | ✔ PASS |
| 5 | getHealth() → assets_total=35 | ✔ PASS |
| 6 | getAssetByPath(server.js) → CRITICAL | ✔ PASS |

**Observação:** O baseline criado em INT-01A foi consumido correctamente. getAllAssets() retorna 35 activos (10 CRITICAL + 23 HIGH + 2 MEDIUM individuais). getAssetByPath() resolve correctamente o activo mais crítico do sistema.

---

### FASE 9.2 — HashChecker: detecção e deduplicação (3 testes)

| # | Teste | Status |
|---|---|---|
| 7 | computeFileSha256 coincide com hash esperado (A) | ✔ PASS |
| 8 | Evento INTEGRITY_HASH_CHANGED emitido | ✔ PASS |
| 9 | Deduplicação: 3 eventos suprimidos | ✔ PASS |

**Observação:** A função utilitária `computeFileSha256` produz hash determinístico. O EventBus suprimiu correctamente 3 emissões duplicadas dentro da janela de 30s.

---

### FASE 9.3 — PermChecker: detecção de permissão (3 testes)

| # | Teste | Status |
|---|---|---|
| 10 | Evento INTEGRITY_PERM_CHANGED registado | ✔ PASS |
| 11 | chmod 777 aplicado ao ficheiro de teste | ✔ PASS |
| 12 | Permissão restaurada a 644 | ✔ PASS |

**Observação:** Alteração de permissão (`chmod 644 → 777`) e restauração (`chmod 777 → 644`) verificadas. O evento `INTEGRITY_PERM_CHANGED` foi gerado correctamente.

---

### FASE 9.4 — EventBus: FIFO, limite, event_id único (3 testes)

| # | Teste | Status |
|---|---|---|
| 13 | EventBus emitiu 10 eventos distintos | ✔ PASS |
| 14 | Todos os event_id são únicos | ✔ PASS |
| 15 | FIFO: ordem correcta | ✔ PASS |

**Observação:** 10 eventos com paths distintos foram emitidos. Todos os 10 event_id são únicos (formato `int-YYYYMMDDHHMMSS-NNNN`). O dequeue retornou o primeiro evento inserido (ordem FIFO confirmada).

---

### FASE 9.5 — CorrelationEngine: shadow log e enriquecimento (3 testes)

| # | Teste | Status |
|---|---|---|
| 16 | Shadow log existe e contém entradas de integridade | ✔ PASS |
| 17 | CorrelationEngine processou 1 evento | ✔ PASS |
| 18 | Deploy mode suprime eventos: 1 suprimido | ✔ PASS |

**Observação:** O shadow log foi criado em `/var/log/impetus-integrity-shadow.log`. O evento de hash alterado foi enriquecido com `asset_id=INT-C-001`, `severity_final=CRITICAL`, `escalate_to_observatory=true`. A supressão via `IMPETUS_DEPLOY_MODE=active` funcionou correctamente.

**Exemplo de evento no shadow log:**
```json
{
  "event_id": "int-20260723130448-0013",
  "schema_version": "1.0",
  "timestamp": "2026-07-23T13:04:48.653Z",
  "event_type": "INTEGRITY_HASH_CHANGED",
  "severity": "CRITICAL",
  "asset_path": "/var/www/impetus-completa/backend/src/server.js",
  "asset_id": "INT-C-001",
  "asset_criticality": "CRITICAL",
  "sensor_component": "HashChecker",
  "confidence": "HIGH",
  "severity_final": "CRITICAL",
  "escalate_to_observatory": true,
  "false_positive_score": 0,
  "response_required": true
}
```

---

### FASE 10 — Determinismo (2 testes)

| # | Teste | Status |
|---|---|---|
| 19 | 5 hashes idênticos: e9746cf7e260c13b… | ✔ PASS |
| 20 | Formato event_id determinístico: int-20260723130448-0015 | ✔ PASS |

---

### FASE 11 — Performance (4 testes)

| # | Teste | Status |
|---|---|---|
| 21 | 100× SHA256 server.js: total=29.9ms avg=0.30ms | ✔ PASS |
| 22 | stat() avg: 0.005ms — custo = 1.8% do hash | ✔ PASS |
| 23 | 1000 eventos no EventBus: 7.1ms total | ✔ PASS |
| 24 | Memória: heap=5.3MB rss=47.4MB | ✔ PASS |

---

### FASE 12 — Reversibilidade (1 teste)

| # | Teste | Status |
|---|---|---|
| 25 | IntegrityRuntime.init() com flag=false → getEngine()=null | ✔ PASS |

---

## 3. Critérios de aceite satisfeitos

| Critério | Resultado |
|---|---|
| `INT_01B_STATUS` | **PASS** |
| `ENGINE_IMPLEMENTED` | **TRUE** |
| `BASELINE_CONSUMED` | **TRUE** (35 activos carregados) |
| `AUDITD_CONNECTED` | **TRUE** (bridge configurado, posicionado no fim do log) |
| `HASHCHECKER_ACTIVE` | **TRUE** (stat-first + SHA256) |
| `PERMCHECKER_ACTIVE` | **TRUE** (mode bits + owner) |
| `EVENTBUS_ACTIVE` | **TRUE** (FIFO + dedup + limit) |
| `CORRELATION_ACTIVE` | **TRUE** (enriquecimento + shadow log) |
| `SHADOW_MODE_ONLY` | **TRUE** (nenhum consumidor externo) |
| `ENGINE_DETERMINISTIC` | **TRUE** |
| `NO_DASHBOARD_INTEGRATION` | **TRUE** |
| `NO_SECURITY_REGRESSION` | **TRUE** |
| `FORENSIC_EVIDENCE_PRESERVED` | **TRUE** |
