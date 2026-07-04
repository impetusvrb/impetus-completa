# BASELINE-LOCK-01 — Matriz Consolidada

**Data:** 2026-07-03

---

## 1. Matriz de certificações

| ID | Documento | Status | Evidência | Baseline v1 |
|----|-----------|--------|-----------|-------------|
| EG-20 | EVENT_GOVERNANCE_CERTIFICATION_V1.md | CERTIFICADO COM RESSALVAS | evidence/event-governance-20/ | ✅ Congelado |
| INTEG-01 | EVENT_GOVERNANCE_INTEGRATION_REPORT.md | CERTIFICADO COM RESSALVAS | evidence/integ-01/ | ✅ |
| PROMOTION-01 | ENTERPRISE_RUNTIME_PROMOTION.md | READY COM RESSALVAS | evidence/promotion-01/ | ✅ |
| PROMOTION-02 | PROMOTION_02_ACTIVATION_REPORT.md | SUCCESSFUL (staging) | evidence/promotion-02/ | ✅ |
| ECO-01 | ECO_01_CONVERGENCE_AUDIT.md | AUDITORIA CONCLUÍDA | evidence/eco-01/ | ✅ |
| ECO-02 | ECO_02_CONVERGENCE_ARCHITECTURE.md | CONTRATO CERTIFICADO | evidence/eco-02/ | ✅ |
| ECO-03 | ECO_03_BYPASS_MIGRATION.md | CERTIFICADO COM RESSALVAS | evidence/eco-03/ | ✅ |
| ECO-04 | ECO_04_CONTROLLER_CONSUMER.md | CERTIFICADO COM RESSALVAS | evidence/eco-04/ | ✅ |
| ECO-05 | ECO_05_PULSE_CONSUMER.md | CERTIFICADO COM RESSALVAS | evidence/eco-05/ | ✅ |
| ECO-06 | ECO_06_CONTEXT_CONSUMER.md | CERTIFICADO COM RESSALVAS | evidence/eco-06/ | ✅ |
| ECO-07 | ECO_07_EXECUTIVE_CONSUMER.md | CERTIFICADO COM RESSALVAS | evidence/eco-07/ | ✅ |
| ECO-08 | ECO_08_ENTERPRISE_CERTIFICATION.md | ECOSYSTEM CERTIFIED W/ REMARKS | evidence/eco-08/ | ✅ |
| FORENSICS-01 | CERT-ONPREM-FORENSICS-01.md | CERTIFICADO | — | ✅ |
| ARCHITECTURE-01 | CERT-ONPREM-ARCHITECTURE-01.md | CERTIFICADO | — | ✅ |
| INFRA-01 | CERT-ONPREM-INFRA-01.md | CERTIFICADO | — | ✅ |
| DATA-01 | CERT-ONPREM-DATA-01.md | CERTIFICADO | — | ✅ |
| LICENSE-01 | CERT-LICENSE-01.md | CERTIFICADO | — | ✅ |
| CONTAINER-01 | CERT-ONPREM-CONTAINER-01.md | CERTIFICADO | — | ✅ |
| BACKUP-01 | CERT-ENTERPRISE-BACKUP-01.md | CERTIFICADO | — | ✅ |
| HOUSEKEEPING-01 | CERT-ENTERPRISE-HOUSEKEEPING-01.md | CERTIFICADO | — | ✅ |
| ENV-QUALIFICATION-01 | CERT-ENTERPRISE-ENV-QUALIFICATION-01.md | REPROVADA | — | ⚠️ Ops |
| STAGING-01 | CERT-ENTERPRISE-STAGING-01.md | PENDENTE | — | ⚠️ Ops |
| ROLLBACK-01 | CERT-ENTERPRISE-ROLLBACK-01.md | REPROVADA | — | ⚠️ Ops |
| VALIDATION-01 | CERT-ONPREM-VALIDATION-01.md | NÃO HOMOLOGADA | — | ⚠️ Ops |
| GOLIVE-01 | CERT-ENTERPRISE-GOLIVE-01.md | PREPARADA | — | ⚠️ Ops |
| **BASELINE-LOCK-01** | ENTERPRISE_BASELINE_V1.md | **ENCERRADA COM RESSALVAS** | evidence/baseline-lock-01/ | ✅ **Lock** |

---

## 2. Matriz de ADRs

| ADR | Classificação | Fase |
|-----|---------------|------|
| ADR-001 … ADR-009 | Implementado | Enterprise core |
| ADR-010 … ADR-019 | Implementado | Infra |
| ADR-020 | Implementado | Housekeeping |
| ADR-ECO-001 | Parcial (shadow) | ECO-04 ✅ |
| ADR-ECO-002 | Parcial (shadow) | ECO-05 ✅ |
| ADR-ECO-003 | Parcial (shadow) | ECO-07 ✅ |
| ADR-ECO-004 | Parcial (shadow) | ECO-06 ✅ |
| ADR-ECO-005 | **Futuro** | Retirement v2 |

---

## 3. Matriz de consumidores ECO

| Consumidor | Adapter | Flag | Modo | Convergência |
|------------|---------|------|------|--------------|
| operationalActionExecutor | chatOperationalGovernanceAdapter | ECO_OAE_VIA_EG | Shadow | Convergido |
| operationalRealtimeCoordinator | chatOperationalGovernanceAdapter | ECO_CHAT_VIA_EG | Shadow | Convergido |
| organizationalAI | chatOperationalGovernanceAdapter | ECO_ORG_AI_VIA_EG | Shadow | Convergido |
| cognitiveControllerService | cognitiveControllerConsumerAdapter | ECO_CONTROLLER_VIA_EG | Shadow | Convergido |
| pulseCognitiveService | pulseGovernanceConsumerAdapter | ECO_PULSE_VIA_EG | Shadow | Convergido |
| conversationContextEngine | conversationKnowledgeConsumerAdapter | ECO_CONTEXT_VIA_EG | Shadow | Convergido |
| pulse + boardroom | executiveInsightsConsumerAdapter | ECO_EXECUTIVE_VIA_EG | Shadow | Convergido |

---

## 4. Matriz de feature flags

| Flag | Classificação | Ambiente | Valor baseline |
|------|---------------|----------|----------------|
| EVENT_GOVERNANCE_LEARNING | baseline | produção | true |
| EVENT_GOVERNANCE_MEMORY | baseline | produção | true |
| EVENT_GOVERNANCE_EXPLAINABILITY | baseline | produção | true |
| EVENT_GOVERNANCE_INTELLIGENCE | baseline | produção | true |
| EVENT_GOVERNANCE_POLICY_OPTIMIZATION | baseline | produção | true |
| EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS | baseline | produção | true |
| EVENT_GOVERNANCE_KNOWLEDGE_BASE | baseline | produção | true |
| ECO_OAE_VIA_EG | shadow / consumer | staging | false |
| ECO_CHAT_VIA_EG | shadow / consumer | staging | false |
| ECO_ORG_AI_VIA_EG | shadow / consumer | staging | false |
| ECO_CONTROLLER_VIA_EG | shadow / consumer | staging | false |
| ECO_PULSE_VIA_EG | shadow / consumer | staging | false |
| ECO_CONTEXT_VIA_EG | shadow / consumer | staging | false |
| ECO_EXECUTIVE_VIA_EG | shadow / consumer | staging | false |

---

## 5. Matriz de observabilidade

| Endpoint | Fase | Verificado |
|----------|------|------------|
| /api/audit/event-governance/status | EG | ✅ |
| /api/audit/event-governance/execution | EG | ✅ |
| /api/audit/event-governance/learning | EG-13 | ✅ |
| /api/audit/event-governance/memory | EG-14 | ✅ |
| /api/audit/event-governance/explainability | EG-15 | ✅ |
| /api/audit/event-governance/intelligence | EG-16 | ✅ |
| /api/audit/event-governance/policy-optimization | EG-17 | ✅ |
| /api/audit/event-governance/executive-insights | EG-18 | ✅ |
| /api/audit/event-governance/knowledge-base | EG-19 | ✅ |
| /api/audit/eco-convergence/status | ECO-03 | ✅ |
| /api/audit/eco-controller/status | ECO-04 | ✅ |
| /api/audit/eco-pulse/status | ECO-05 | ✅ |
| /api/audit/eco-context/status | ECO-06 | ✅ |
| /api/audit/eco-executive/status | ECO-07 | ✅ |

---

## 6. Matriz de NCs (encerramento)

| NC | Severidade | Bloqueia baseline lock? |
|----|------------|-------------------------|
| NC-BL-01 | Baixa | Não |
| NC-BL-02 | Baixa | Não |
| NC-BL-03 | Média (ops) | Não — fora escopo eng. v1 |
| NC-BL-04 | Média (staging) | Não — shadow deliberado |
| NC-BL-05 | Baixa | Não — v2 cycle |
| NC-ECO-03-001 … 07-001 | Staging | Não |

---

## 7. Legado / parcial (aceite na baseline)

| Item | Classificação |
|------|---------------|
| AIOI Executive Cockpit | Legado — domínio separado |
| Cognitive Pulse vivo | Local — operacional |
| Event Backbone bridge | Parcial — NC-INT-002 |
| Frontend audit EG UI | Pendente UI — backend OK |
