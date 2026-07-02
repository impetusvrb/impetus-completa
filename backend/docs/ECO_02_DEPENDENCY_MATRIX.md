# ECO-02 — Matriz de Dependências

**Programa:** Cognitive Ecosystem Convergence  
**Fase:** 2 — Contrato arquitectural  
**Data:** 2026-07-02

---

## Legenda

| Campo | Descrição |
|-------|-----------|
| **Pipeline actual** | Caminho hoje em produção |
| **Pipeline futuro** | Caminho após fase ECO indicada |
| **Prioridade** | P0 (crítico) → P3 (baixo) |
| **Risco** | Alto / Médio / Baixo |

---

## Matriz principal

| Módulo | Produtor | Consumidor | Pipeline actual | Pipeline futuro | Prioridade | Risco | Fase |
|--------|----------|------------|-----------------|-----------------|------------|-------|------|
| operationalActionExecutor | unifiedAutonomy, operational routes | unifiedMessaging | Bypass directo | Adapter CHAT_OPERATIONAL → EG → executor | **P0** | Alto | ECO-03 |
| operationalRealtimeCoordinator | chat, chatSocket | unifiedMessaging + Gemini | Bypass + IA paralela | Normalizar → EG → executor | **P0** | Alto | ECO-03 |
| organizationalAI | chat org, escalation | appImpetusService | Bypass notifyRecipients | Adapter → EG → executor | **P0** | Alto | ECO-03 |
| CHAT_OPERATIONAL (política) | catálogo EG | — (órfã) | Não ligada | Adapter ECO-03 | **P1** | Médio | ECO-03 |
| NC_BRIDGE_MIRROR (política) | catálogo EG | — (órfã) | Não ligada | Adapter ECO-03 | **P1** | Médio | ECO-03 |
| 11 adapters Grupo A | domínios operacionais | evaluatePrepareAndExecute | Integrado (shadow domínio) | Integrado (domínios ON) | P2 | Baixo | ECO-03/08 |
| unifiedDecisionEngine | Controller, chat | runCognitiveCouncil | decide paralelo | EG decide; engine helper | **P2** | Médio-Alto | ECO-04 |
| cognitiveControllerService | dashboard, API cognitiva | council, backbone sensor | Parallel council | EG → Controller consumer | **P2** | Médio | ECO-04 |
| cognitiveEventBackboneService | orchestrator, security | persistência/replay | Parallel backbone | Bridge publisher → EG | **P3** | Médio | ECO-05 |
| pulseCognitive | eventIngestion, hooks | GOVERNANCE interno | Parallel | EG layers → Pulse consumer | **P3** | Alto | ECO-05 |
| conversationContext | chat entries | prompt assembly | Heurística only | + Knowledge Base consumer | P2 | Baixo | ECO-06 |
| governanceKnowledgeBaseService | audit API | — | ONLINE audit only | Consumido por Conversation Context | P2 | Baixo | ECO-06 |
| governanceExecutiveInsightsService | audit API | — | ONLINE audit only | Consumido por dashboards | P2 | Médio | ECO-07 |
| executiveDashboard (Pulse) | pulseCognitive | frontend | Agregação própria | Executive Insights consumer | P2 | Médio | ECO-07 |
| dashboardContextAdapter | frontend boardroom | runtime Z.27 | DB + runtime | Executive Insights consumer | P2 | Médio | ECO-07 |
| eventGovernanceExecutionService | adapters | Learning→…→Policy Opt | **Baseline congelado** | Inalterado | — | — | — |
| governanceLearningService | pipeline exec | Memory | ONLINE pipeline | Inalterado | — | — | — |
| governanceOperationalMemoryService | Learning | Explainability | ONLINE pipeline | Inalterado | — | — | — |
| governanceExplainabilityService | Memory | Intelligence | ONLINE pipeline | Inalterado | — | — | — |
| governanceIntelligenceService | Explainability | Policy Optimization | ONLINE pipeline | Inalterado | — | — | — |
| governancePolicyOptimizationService | Intelligence | executores | ONLINE pipeline | Inalterado | — | — | — |
| unifiedMessaging | executores EG, **bypasses** | utilizadores | Misto | **Só executores EG** | P0 | Alto | ECO-03 |
| notificationCenterExecutor | EG | unifiedMessaging | Integrado | Integrado | — | Baixo | — |
| chatExecutor | EG | unifiedMessaging | Integrado | Integrado | — | Baixo | — |
| workflowOrchestrator | workflow events | workflow domain | Externo (≠ EG v1) | Observação | P3 | Baixo | — |
| intelligentRegistrationService | registro | escalation flag | Parcial | EG dispatch escalation | P2 | Médio | ECO-03 |
| reminderSchedulerService | scheduler | unifiedMessaging | Bypass | Adapter domínio | P3 | Baixo | ECO-08 |
| manuiaWebPushService | ManuIA | web-push | Bypass | Adapter ou retirement | P3 | Baixo | ECO-08 |
| ANAM | token externo | — | Externo | Opcional KB enrich | P3 | Baixo | — |
| digitalTwinApplied | twin UI | Gemini display | Externo | Executive Insights (ECO-07) | P3 | Baixo | ECO-07 |

---

## Dependências entre fases

```mermaid
flowchart LR
  ECO03[ECO-03 Bypasses P0/P1]
  ECO04[ECO-04 Controller]
  ECO05[ECO-05 Pulse]
  ECO06[ECO-06 KB + Context]
  ECO07[ECO-07 Executive]
  ECO08[ECO-08 Certification]

  ECO03 --> ECO04
  ECO04 --> ECO05
  ECO05 --> ECO06
  ECO06 --> ECO07
  ECO07 --> ECO08
```

| Fase | Depende de | Bloqueia |
|------|------------|----------|
| ECO-03 | ECO-02 | ECO-04, ECO-05, ECO-08 |
| ECO-04 | ECO-03 | ECO-05 |
| ECO-05 | ECO-04 | ECO-06 |
| ECO-06 | ECO-05 | ECO-07 |
| ECO-07 | ECO-06 | ECO-08 |
| ECO-08 | ECO-03–07 | Go-Live cognitivo |

---

## Fluxos paralelos classificados (ECO-01 → ECO-02)

| ID | Tipo | Classificação ECO-02 | Acção |
|----|------|----------------------|-------|
| ECO-BYPASS-001 | bypass | P0 — eliminar ECO-03 | Adapter |
| ECO-BYPASS-002 | bypass | P0 — eliminar ECO-03 | Adapter |
| ECO-BYPASS-003 | bypass | P0 — eliminar ECO-03 | Adapter |
| ECO-PARALLEL-001 | parallel | P2 — consumer ECO-04 | Consumer |
| ECO-PARALLEL-002 | parallel | P3 — bridge ECO-05 | Adapter |
| ECO-PARALLEL-003 | parallel | P3 — consumer ECO-05 | Consumer |
| ECO-ORPHAN-001 | legacy | P1 — adapter ECO-03 | Adapter |
| INTEG-integrated (×11) | integrated | Baseline | Manter |
| workflow.* | external | Observação | Não convergir |

---

## Referências

- [`ECO_01_PARALLEL_FLOWS_INVENTORY.md`](./ECO_01_PARALLEL_FLOWS_INVENTORY.md)
- [`EVENT_GOVERNANCE_CONSUMERS_MATRIX.md`](./EVENT_GOVERNANCE_CONSUMERS_MATRIX.md)
- [`ECO_02_EXECUTION_SEQUENCE.md`](./ECO_02_EXECUTION_SEQUENCE.md)
