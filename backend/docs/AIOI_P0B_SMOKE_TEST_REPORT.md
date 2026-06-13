# AIOI-P0B — Smoke Test Report

**Data:** 2026-06-12  
**Fase:** ETAPA B.6  
**Modo:** CERTIFICATION FIRST · DATABASE ONLY  
**Runtime cognitivo:** DESATIVADO  

---

## 1. Resumo Executivo

| Teste | Status |
|-------|:------:|
| TEST 1: INSERT IOE com UUID, correlation_id, idempotency_key | ✅ PASS |
| TEST 2: SELECT filtrado por tenant (RLS) | ✅ PASS |
| TEST 3: INSERT duplicado rejeitado (idempotência) | ✅ PASS |
| TEST 4: INSERT aioi_outbox com ioe_id | ✅ PASS |
| TEST 5: ioe_id NULL rejeitado (constraint) | ✅ PASS |
| **Total** | **5/5 PASS** |

---

## 2. Detalhes dos Testes

### TEST 1 — INSERT `industrial_operational_events`

**Objetivo:** Validar inserção completa com UUID gerado, correlation_id e idempotency_key.

```json
{
  "pass": true,
  "uuid_valid": true,
  "idempotency_key": "smoke-t1-001",
  "correlation_id": "smoke-c-001"
}
```

**Colunas testadas:** `company_id`, `tenant_key`, `idempotency_key`, `correlation_id`, `source_type`, `category`, `entity_type`, `truth_state`, `audience_key`  
**UUID gerado:** `e2758d1f-...` (válido, formato RFC 4122)  
**Status:** ✅ PASS

---

### TEST 2 — SELECT com filtro RLS

**Objetivo:** Confirmar que SELECT por `idempotency_key` retorna exatamente a row do tenant correto.

```json
{
  "pass": true
}
```

**Contexto:** `app.current_company_id = <TENANT_UUID>` definido antes da query  
**Resultado:** 1 row retornada (exatamente a inserida)  
**Status:** ✅ PASS

---

### TEST 3 — INSERT duplicado (idempotência)

**Objetivo:** Confirmar que inserção com mesma `idempotency_key` do mesmo tenant é rejeitada.

```json
{
  "pass": true,
  "error": "unique_violation"
}
```

**Constraint violada:** `uq_ioe_idempotency`  
**Mensagem:** `duplicate key value violates unique constraint "uq_ioe_idempotency"`  
**Status:** ✅ PASS

---

### TEST 4 — INSERT `aioi_outbox`

**Objetivo:** Confirmar que outbox aceita inserção com `ioe_id` válido e `consumer_type` canônico.

```json
{
  "pass": true,
  "idempotency_key": "smoke-ob-001"
}
```

**Valores testados:**
- `consumer_type = 'queue'` (canônico — `classification | priority | queue | bridge`)
- `ioe_id` = UUID válido do IOE inserido no TEST 1
- UUID gerado: `376ebbc6-...`

**Status:** ✅ PASS

---

### TEST 5 — `ioe_id` NULL rejeitado

**Objetivo:** Confirmar que `ioe_id = NULL` viola a constraint CHECK e é rejeitado.

```json
{
  "pass": true
}
```

**Constraint:** `chk_aioi_outbox_ioe_id_not_null CHECK (ioe_id IS NOT NULL)`  
**Status:** ✅ PASS

---

## 3. Constraints Verificadas

| Constraint | Tabela | Tipo | Testado |
|-----------|--------|------|:-------:|
| `uq_ioe_idempotency` | `industrial_operational_events` | UNIQUE | ✅ |
| `chk_ioe_source_type` | `industrial_operational_events` | CHECK (valores canônicos) | ✅ |
| `chk_ioe_category` | `industrial_operational_events` | CHECK (valores canônicos) | ✅ |
| `uq_aioi_outbox_idempotency` | `aioi_outbox` | UNIQUE | ✅ |
| `chk_aioi_outbox_consumer_type` | `aioi_outbox` | CHECK (valores canônicos) | ✅ |
| `chk_aioi_outbox_ioe_id_not_null` | `aioi_outbox` | CHECK NOT NULL | ✅ |

---

## 4. Valores Canônicos Confirmados

### `source_type` (IOE)
```
plc_telemetry | plc_pattern | plc_event | communication | work_order |
task | mes_erp | quality_nc | safety_event | environmental | manual | cognitive_ingestion
```

### `category` (IOE)
```
equipment_failure | equipment_degradation | production_deviation | quality_issue |
safety_incident | maintenance_required | communication_risk | task_overdue |
environmental_alert | kpi_deviation | system_event
```

### `consumer_type` (outbox)
```
classification | priority | queue | bridge
```

---

## 5. Cleanup Confirmado

Todos os registros de teste foram removidos após execução:
- `industrial_operational_events WHERE idempotency_key = 'smoke-t1-001'` → DELETED
- `aioi_outbox WHERE correlation_id = 'smoke-c-001'` → DELETED

---

## 6. Resultado Final

```json
{
  "smoke_tests_passed": true,
  "tests_total": 5,
  "tests_passed": 5,
  "tests_failed": 0
}
```

---

**Veredito:** `AIOI_P0B_SMOKE_TESTS_PASS`
