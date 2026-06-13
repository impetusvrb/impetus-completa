# AIOI — Execution Bridge Certification

**Camada:** P1.0 — Execution Bridge  
**Serviço:** `backend/src/services/aioi/aioiExecutionBridgeService.js`  
**Payload:** `backend/src/services/aioi/aioiExecutionPayloadBuilder.js`  
**Modo:** HITL-only · delegação soberana · zero execução local  

---

## 1. Responsabilidade

Delegar IOEs **aprovados por humano (HITL)** aos soberanos de execução:

| `decision_type` | Soberano |
|-----------------|----------|
| `workflow` | `workflowOrchestrator.startWorkflow()` |
| `direct_action` | `actionRuntimeOrchestrator.executeToolCall()` |
| `suggest_only` / `escalate` | Skipped (sem delegação) |

---

## 2. Critérios de certificação (PC-EXE)

| ID | Critério | Implementação |
|----|----------|---------------|
| PC-EXE-01 | Exige `approved_by_user_id` | `validateExecutionEligibility()` |
| PC-EXE-02 | Exige `approved_at` | `validateExecutionEligibility()` |
| PC-EXE-03 | Exige `status=approved` | `validateExecutionEligibility()` |
| PC-EXE-04 | Bloqueia `open`, `triaged`, `pending_approval` | `BLOCKED_EXECUTION_STATUSES` |
| PC-EXE-05 | Preserva `truth_state`, `evidence_refs`, `correlation_id`, `external_ref_id` | Payload builders + SQL fetch |
| PC-EXE-06 | Sem bypass HITL | Query batch exige HITL fields |

---

## 3. Fluxo certificado

```
IOE (status=approved, HITL confirmado)
  ↓ validateExecutionEligibility()
  ↓ resolveExecutionTarget(decision_type)
  ↓ buildWorkflowPayload() | buildActionPayload()
  ↓ workflowOrchestrator | actionRuntimeOrchestrator
  ↓ persist workflow_instance_id | execution_trace_id
  ↓ status → in_progress
```

---

## 4. Idempotência (E4)

- Rejeita re-delegação se `execution_trace_id` ou `workflow_instance_id` já presentes
- UPDATE condicional com `WHERE status='approved' AND refs IS NULL`

---

## 5. Proibições

- Execução local no AIOI
- `operationalDecisionEngine`, Truth, Learning
- Worker/cron/PM2/API autónoma
- LLM (OpenAI, Claude, Gemini)
- Execução sem HITL

---

## 6. RLS / Tenant

Todas as queries via `_withTenantClient()`:

- `set_config('app.current_company_id', companyId)`
- `set_config('app.bypass_rls', 'false')`

---

## 7. Teste de auditoria

`backend/src/tests/aioi/AioiExecutionBridgeCertificationAudit.test.js`

---

## 8. Token

**EXECUTION_BRIDGE_CERTIFIED**
