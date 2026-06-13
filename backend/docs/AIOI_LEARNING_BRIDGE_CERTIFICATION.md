# AIOI — Learning Bridge Certification

**Camada:** P1.2 — Learning Bridge  
**Serviço:** `backend/src/services/aioi/aioiLearningBridgeService.js`  
**Payload:** `backend/src/services/aioi/aioiLearningPayloadBuilder.js`  
**Soberano:** `operationalLearningService.recordOperationalOutcome()`  

---

## 1. Responsabilidade

Delegar `learning_context` de IOEs **COMPLETED/resolved** ao soberano de aprendizado operacional — **sem aprendizado local**.

---

## 2. Critérios de certificação (PC-LRN)

| ID | Critério | Implementação |
|----|----------|---------------|
| PC-LRN-01 | Somente `status=resolved` (COMPLETED) | `processResolvedIoe()` |
| PC-LRN-02 | Outcome obrigatório (`learning_context`) | `extractLearningContext()` |
| PC-LRN-03 | `correlation_id` preservado | Enriquecimento + payload builder |
| PC-LRN-04 | `evidence_refs` preservados | Enriquecimento + payload builder |
| PC-LRN-05 | `truth_state` preservado | Enriquecimento + payload builder |
| PC-LRN-06 | Sem aprendizado autônomo | Invocação explícita apenas |
| PC-LRN-07 | Sem ajuste de pesos | Proibido no código |
| PC-LRN-08 | Sem `weight_versions` | Proibido no código |
| PC-LRN-09 | Sem rerank | Proibido no código |
| PC-LRN-10 | Delegação exclusiva `operationalLearningService` | `_delegateToLearningService()` |

---

## 3. Fluxo certificado

```
IOE (status=resolved, aioi_outcome.learning_context presente)
  ↓ extractLearningContext()
  ↓ validateLearningPayload()
  ↓ enrich (correlation_id, truth_state, evidence_refs)
  ↓ buildLearningPayload()
  ↓ operationalLearningService.recordOperationalOutcome()
  ↓ decision_payload.aioi_learning_submitted = true
```

---

## 4. Idempotência (L4)

- `hasLearningSubmitted()` verifica flag `aioi_learning_submitted`
- UPDATE condicional evita dupla submissão

---

## 5. Proibições

- Aprendizado local (learn/train/fit/updateModel)
- `operationalDecisionEngine`, Truth, classification
- `workflowOrchestrator`, `actionRuntimeOrchestrator`
- Worker/cron/PM2/API autónoma
- LLM / rerank / weight_versions

---

## 6. Teste de auditoria

`backend/src/tests/aioi/AioiLearningBridgeCertificationAudit.test.js`

---

## 7. Token

**LEARNING_BRIDGE_CERTIFIED**
