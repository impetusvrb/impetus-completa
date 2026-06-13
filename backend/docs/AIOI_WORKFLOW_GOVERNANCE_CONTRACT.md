# AIOI_WORKFLOW_GOVERNANCE_CONTRACT

**Fase:** AIOI-ORG-5 — Workflow & SLA Readiness  
**Data:** 2026-06-10  
**Modo:** ADDITIVE ONLY · CERTIFICATION FIRST  
**Pré-requisitos:** ORG-1..ORG-4 PASS

---

## 1. Declaração

Este contrato define os **estados oficiais do workflow AIOI**, as **transições válidas** e as **transições proibidas**. Nenhuma execução automática ou runtime cognitivo é autorizado por este contrato.

---

## 2. Estados Oficiais

| Estado Canónico | IOE `status` DB | Descrição |
|-----------------|-----------------|-----------|
| **OPEN** | `open` | IOE criado; aguarda classificação |
| **TRIAGED** | `triaged` | Classificado deterministicamente (P0.8) |
| **PROPOSED** | `pending_approval` | Decisão proposta; aguarda HITL |
| **APPROVED** | `approved` | HITL confirmado |
| **EXECUTING** | `in_progress` | Execução delegada (P1.0 bridge) |
| **COMPLETED** | `resolved` / `closed` | Resolvido ou fechado |
| **LEARNING** | `resolved` + learning_context | Outcome submetido ao learning bridge |

---

## 3. Workflow State Matrix

| De → Para | OPEN | TRIAGED | PROPOSED | APPROVED | EXECUTING | COMPLETED | LEARNING |
|-----------|------|---------|----------|----------|-----------|-----------|----------|
| **OPEN** | — | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **TRIAGED** | ❌ | — | ✅ | ❌ | ❌ | ❌ | ❌ |
| **PROPOSED** | ❌ | ❌ | — | ✅ | ❌ | ❌ | ❌ |
| **APPROVED** | ❌ | ❌ | ❌ | — | ✅ | ❌ | ❌ |
| **EXECUTING** | ❌ | ❌ | ❌ | ❌ | — | ✅ | ❌ |
| **COMPLETED** | ❌ | ❌ | ❌ | ❌ | ❌ | — | ✅ |
| **LEARNING** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — |

---

## 4. Transições Válidas (ORG-5)

| ID | Transição | Responsável | Modo |
|----|-----------|-------------|------|
| WF-01 | OPEN → TRIAGED | `aioiClassificationConsumerService` | Determinístico |
| WF-02 | TRIAGED → PROPOSED | `aioiDecisionBridgeService` | WRAP ODE |
| WF-03 | PROPOSED → APPROVED | HITL manual | Utilizador |
| WF-04 | APPROVED → EXECUTING | `aioiExecutionBridgeService` | Delegação P1 |
| WF-05 | EXECUTING → COMPLETED | Execution bridge / workflow | P1 |
| WF-06 | COMPLETED → LEARNING | `aioiLearningBridgeService` | Delegação P1.2 |

---

## 5. Transições Proibidas (ORG-5)

| ID | Transição | Motivo |
|----|-----------|--------|
| WF-P01 | OPEN → APPROVED | Bypass classificação + HITL |
| WF-P02 | OPEN → EXECUTING | Bypass classificação + decisão + HITL |
| WF-P03 | OPEN → COMPLETED | Bypass total |
| WF-P04 | TRIAGED → EXECUTING | Bypass decisão + HITL |
| WF-P05 | Qualquer → EXECUTING sem APPROVED | HITL obrigatório (R2 P0) |
| WF-P06 | Qualquer transição via LLM | Proibido em P0/P1 foundation |

---

## 6. Enforcement

| Camada | Mecanismo |
|--------|-----------|
| Classification | `aioiClassificationEngine` rejeita status != 'open' |
| Decision Bridge | Só processa status='triaged' |
| Execution Bridge | Exige `approved_by_user_id` + `approved_at` |
| Auditoria | `AioiWorkflowGovernanceAudit.test.js` |

---

## 7. Soberania Preservada

| Domínio | Soberano | Alterado? |
|---------|----------|-----------|
| Queue CEO | `aioi_executive_queue_snapshot` (ORG-1) | NÃO |
| Truth | `industrialTruthEnforcementService` (ORG-2) | NÃO |
| F49 | Classificado ORG-3 | NÃO |
| PLC Score | `operationalPrioritizationService` (F47) | NÃO |
| Decisão | `operationalDecisionEngine` | NÃO |

---

*AIOI_WORKFLOW_GOVERNANCE_CONTRACT — ORG-5.*
