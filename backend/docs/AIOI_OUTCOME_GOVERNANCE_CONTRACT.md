# AIOI — Outcome Governance Contract

**Camada:** P1.3 — Outcome Governance  
**Modo:** HITL · evidência preservada · zero IA operacional  

---

## 1. Princípios

1. **Outcome é observação, não decisão** — não recalcula prioridade, classificação ou truth.
2. **Evidência imutável na cadeia** — nenhuma etapa remove `evidence_refs`, `correlation_id`, `truth_state`.
3. **Learning é delegado** — outcome apenas prepara `learning_context`; submissão via Learning Bridge.
4. **HITL obrigatório upstream** — outcome só existe após execução delegada de IOE aprovado.

---

## 2. Regras de governança (OC-*)

| ID | Regra |
|----|-------|
| OC-01 | Outcome exige referência de execução (`workflow_instance_id` ou `execution_trace_id`) |
| OC-02 | `outcome_status` deve ser um de: success, partial_success, failure, cancelled, rejected |
| OC-03 | `evidence_refs` deve ser array (pode ser vazio) |
| OC-04 | `learning_context` inclui `correlation_id` e `truth_state` quando disponíveis |
| OC-05 | Captura idempotente — segunda captura rejeitada |
| OC-06 | Sem LLM no path de outcome |
| OC-07 | Sem alteração de `industrialTruthEnforcementService` |
| OC-08 | Sem alteração de `operationalPrioritizationService` |

---

## 3. Mapeamento outcome → learning

| outcome_status | success (learning) |
|----------------|-------------------|
| success | `true` |
| partial_success | `true` |
| failure | `false` |
| cancelled | `false` |
| rejected | `false` |

---

## 4. Transições IOE permitidas pós-outcome

```
in_progress → resolved   (outcome capturado)
resolved    → resolved   (learning_context adicionado, sem mudança de status)
```

Learning Bridge opera sobre `resolved` — não altera status para estado separado `learning`.

---

## 5. Responsabilidades

| Componente | Papel |
|------------|-------|
| `aioiOutcomePayloadBuilder` | Constrói payload canónico + learning_context |
| `aioiOutcomeTrackingService` | Persiste em `decision_payload.aioi_outcome` |
| `aioiLearningBridgeService` | Submete learning_context ao soberano |

---

## 6. Auditoria

- `AioiOperationalEvidenceChainAudit.test.js`
- `AioiP1OperationalRolloutAudit.test.js`

---

## 7. Token

**OUTCOME_CHAIN_CERTIFIED**
