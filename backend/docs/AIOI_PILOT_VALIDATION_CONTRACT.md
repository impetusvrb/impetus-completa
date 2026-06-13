# AIOI — Pilot Validation Contract

**Camada:** P3.2 — Pilot Execution Validation  
**Modo:** Auditoria operacional · cadeia ponta a ponta  

---

## 1. Cadeia de validação

```
IOE (ingestão)
  → Outbox
  → Classification
  → Decision
  → Execution (HITL)
  → Outcome
  → Learning
```

---

## 2. Critérios PV-*

| ID | Critério | Componente |
|----|----------|------------|
| PV-01 | IOE criado corretamente | `aioiEventIngestionService` |
| PV-02 | Outbox processado corretamente | `aioiOutboxConsumerService` |
| PV-03 | Classification executada | `aioiClassificationConsumerService` |
| PV-04 | Decision criada | `aioiDecisionBridgeService` |
| PV-05 | Execution delegada (HITL) | `aioiExecutionBridgeService` |
| PV-06 | Outcome capturado | `aioiOutcomeTrackingService` |
| PV-07 | Learning submetido | `aioiLearningBridgeService` |
| PV-08 | Evidence chain íntegra | Cadeia P1.4 |
| PV-09 | `truth_state` preservado | Payload builders + adapters |
| PV-10 | `correlation_id` preservado | IOE → Learning |

---

## 3. Regras

- Validação por auditoria estática + contratos P1/P2
- Sem execução autónoma
- Sem LLM no path operacional

---

## 4. Token

**PILOT_VALIDATION_CERTIFIED**
