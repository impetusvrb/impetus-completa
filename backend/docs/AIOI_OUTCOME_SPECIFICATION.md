# AIOI — Outcome Specification

**Camada:** P1.3 — Outcome Persistence  
**Builder:** `backend/src/services/aioi/aioiOutcomePayloadBuilder.js`  
**Tracking:** `backend/src/services/aioi/aioiOutcomeTrackingService.js`  

---

## 1. Propósito

Definir o contrato formal de **outcome operacional** — resultado observável após execução HITL-delegada — e preparar `learning_context` para o Learning Bridge (sem invocação autónoma).

---

## 2. Estados canónicos

| Canónico (spec) | Valor IOE (persistido) | Descrição |
|-----------------|------------------------|-----------|
| `SUCCESS` | `success` | Execução concluída com objetivo atingido |
| `PARTIAL_SUCCESS` | `partial_success` | Objetivo parcialmente atingido |
| `FAILED` | `failure` | Execução falhou ou objetivo não atingido |
| `CANCELLED` | `cancelled` | Execução cancelada antes da conclusão |
| `REJECTED` | `rejected` | Rejeitado em gate HITL pós-proposta |

---

## 3. Payload canónico

```json
{
  "outcome_status": "success",
  "outcome_summary": "string | null",
  "execution_duration_ms": "number | null",
  "evidence_refs": [],
  "execution_reference": {
    "type": "workflow | action",
    "ref_id": "uuid",
    "correlation_id": "string | null"
  },
  "captured_at": "ISO8601",
  "learning_context": { }
}
```

---

## 4. Pré-requisitos de captura

1. IOE em `in_progress` ou `resolved`
2. `execution_trace_id` **ou** `workflow_instance_id` presente
3. `validateOutcomePayload()` aprovado

---

## 5. Cadeia de rastreabilidade

```
IOE (ingestão)
  → Outbox
  → Classification
  → Decision
  → Execution (bridge)
  → Outcome (capture)
  → Learning (bridge)
```

Campos propagados em toda a cadeia:

- `correlation_id`
- `external_ref_id`
- `evidence_refs`
- `truth_state`
- `scores_provisional` (IOE / queue projection)

---

## 6. Learning context (preparado, não invocado)

Campos mínimos em `decision_payload.aioi_outcome.learning_context`:

| Campo | Obrigatório |
|-------|-------------|
| `company_id` | Sim |
| `machine_id` | Sim |
| `action_type` | Sim |
| `success` | Sim (boolean) |
| `correlation_id` | Sim |
| `truth_state` | Recomendado |
| `evidence_refs` | Recomendado |
| `outcome_status` | Sim |

---

## 7. Idempotência (O4)

- `hasCapturedOutcome()` — verifica `aioi_outcome` ou `aioi_outcome_captured`

---

## 8. Proibições

- Invocar `operationalLearningService` diretamente no outcome builder
- Recalcular score, classificação ou decisão
- LLM na determinação de outcome

---

## 9. Referências

- `AIOI_IOE_SPECIFICATION.md`
- `AIOI_OUTCOME_GOVERNANCE_CONTRACT.md`
- `AIOI_LEARNING_BRIDGE_CERTIFICATION.md`
