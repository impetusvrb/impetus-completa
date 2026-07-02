# ECO-01 — Inventário de Fluxos Paralelos e Bypasses

**Fase:** 1 — Inventário completo  
**Baseline EG:** v1 certificado + Grupo A ONLINE

---

## Legenda

| Tipo | Descrição |
|------|-----------|
| **integrated** | Passa por adapter + `evaluatePrepareAndExecute` |
| **bypass** | Decisão/notificação sem Event Governance |
| **parallel** | Subsistema com lógica própria (não é defeito EG) |
| **legacy** | Fallback shadow/legado nos adapters |

---

## A. Integrados (baseline)

| Produtor | Adapter | Flag domínio |
|----------|---------|--------------|
| operationalAlertsService | operationalAlertsGovernanceAdapter | OPERATIONAL_ALERTS |
| aiProactiveMessagingService | aiProactiveGovernanceAdapter | AI_PROACTIVE |
| tpmNotifications | tpmGovernanceAdapter | TPM |
| executiveMode (send) | executiveGovernanceAdapter | EXECUTIVE |
| subscriptionBillingNotificationService | billingGovernanceAdapter | BILLING |
| dsrNotificationService | dsrGovernanceAdapter | DSR |
| manuiaInboxIngestService | manuiaGovernanceAdapter | MANUIA |
| qualityIntelligenceService | qualityGovernanceAdapter | QUALITY |
| sstNotificationService | sstGovernanceAdapter | SST |
| esgNotificationService | esgGovernanceAdapter | ESG |
| aioiGovernanceIntegrationService | aioiGovernanceAdapter | AIOI |

---

## B. Bypass P0 — Notificação operacional

### B1. operationalActionExecutor.js

| Campo | Valor |
|-------|-------|
| Funções | `executeOperationalActions` |
| Bypass | `unifiedMessaging.sendToUser` (L370, L409) |
| Tipos | `operational_decision`, `autonomous_suggestion` |
| NC | NC-INT-004 |
| Severidade | **Alta** |
| Esforço | Médio |
| Callers | `routes/operational.js`, `unifiedAutonomyService`, `dataRetrievalService` |

### B2. operationalRealtimeCoordinator.js

| Campo | Valor |
|-------|-------|
| Funções | `processChatMessage`, `notifyUsers` |
| Bypass | `unifiedMessaging.sendToUser` (L103) |
| IA | `geminiService.classifyRouting` |
| Severidade | **Alta** |
| Esforço | 1–2 sprints |
| Chain | `chat.js` / `chatSocket.js` → coordinator → messaging |

### B3. organizationalAI.js

| Campo | Valor |
|-------|-------|
| Funções | `processMessage`, `notifyRecipients` |
| Bypass | `appImpetusService.sendMessage` directo |
| IA | classificação operacional + escalation |
| Severidade | **Alta** |
| Esforço | 1–2 sprints |

---

## C. Bypass P1–P4 — Outros

| Ficheiro | Função | Severidade | Esforço |
|----------|--------|------------|---------|
| executiveMode.js | catch fallback L591+ | Média | Baixo |
| operationalAlertsService.js | catch notificationBridge | Média | Baixo |
| reminderSchedulerService.js | scheduler notify | Média | Baixo |
| appCommunicationService.js | outbound log | Média | Baixo |
| messagingAdapter.js | wrapper genérico | Média | Baixo |
| routes/admin/incidents.js | admin notify | Baixa | Baixo |
| manuiaWebPushService.js | web-push direct | Baixa | Baixo |
| esg/sst legacy | `runLegacyDistribution` | Média | Baixo* |

\*Esperado enquanto flags domínio OFF.

---

## D. Parallel — Subsistemas (Grupo B + motores)

### D1. Cognitive Controller (NC-INT-001)

| Ficheiro | `cognitiveControllerService.js` |
| Entry | `handleCognitiveRequest` |
| Pipeline | `runCognitiveCouncil` + `eventPipelineGovernanceService` (sensor) |
| EG | ❌ |
| Severidade | Média |
| Esforço | Alto |

### D2. Event Backbone (NC-INT-002)

| Ficheiro | `cognitiveEventBackboneService.js` |
| Publishers | unifiedOrchestrator, aiSecurityGateway, attachPipelineBusHooks |
| Subscriber EG | ❌ |
| Severidade | Média |
| Esforço | Médio |

### D3. Pulse Cognitive (NC-INT-006)

| Módulos | cognitiveMotor, organizationalAI, eventIngestion, executiveDashboard, hooks |
| Governança | `pulseCognitive/constants.js` GOVERNANCE interno |
| EG | ❌ |
| Severidade | Média |
| Esforço | Alto |

### D4. unifiedDecisionEngine.js

| Função | `decide` |
| Notas | `governance_notes` internas — **não** Event Governance v1 |
| Severidade | Média-Alta |
| Esforço | Alto |

### D5. unifiedOrchestrator.js

| Função | `executeCognitiveFlow` |
| Backbone | publish LLM_EXECUTION |
| Severidade | Média |
| Esforço | Alto |

### D6. Conversation Context Engine

| Raiz | `backend/src/conversationContext/` |
| Funções | resolveConversationContext, classifyConversationContext |
| Impacto | Prompt/style apenas — sem notificação |
| Severidade | Baixa |
| Esforço | Baixo |

### D7. Workflow Engine

| Ficheiro | `workflowOrchestrator.js` |
| Eventos | `governance.workflow.*` (domínio workflow, não EG v1) |
| Severidade | Baixa |
| Esforço | Baixo |

---

## E. Executive / Dashboard — fontes de métricas

| Fonte | Ficheiro | Usa Executive Insights EG? |
|-------|----------|---------------------------|
| Pulse executive | pulseCognitive/executiveDashboard.js | ❌ |
| Cognitive pulse | cognitivePulseService.js | ❌ |
| Org intelligence | organizationalIntelligenceEngine.js | ❌ |
| Dashboard chat | routes/dashboard.js | ❌ (council) |
| Frontend boardroom | dashboardContextAdapter.js | ❌ (runtime Z.27) |
| Executive CEO send | executiveMode.js | ✅ adapter (send only) |

**Gap ECO Fase 7:** dashboards devem consumir `governanceExecutiveInsightsService` (audit API).

---

## F. ANAM / Registro Inteligente / Digital Twin

| Módulo | Decisão/IA | Notificação | Convergência |
|--------|------------|-------------|--------------|
| ANAM | token/sessão externa | ❌ | Baixa prioridade |
| intelligentRegistrationService | `processWithAI` | flag `needs_escalation` sem dispatch | Média |
| digitalTwinApplied | Gemini diagnóstico | ❌ | Baixa |
| organizationalIntelligenceEngine | `buildDigitalTwin` | ❌ | Baixa (display) |

---

## G. Políticas órfãs (NC-INT-005)

| Política | sourceModules no catálogo | Adapter |
|----------|---------------------------|---------|
| CHAT_OPERATIONAL | operationalRealtimeCoordinator, operationalActionExecutor | ❌ |
| NC_BRIDGE_MIRROR | notificationBridgeService, unifiedMessagingService | ❌ |
| DEFAULT_INFO | fallback genérico | ❌ |

---

## H. unifiedMessaging — mapa de chamadas

| Integrado (executor EG) | Bypass |
|-------------------------|--------|
| notificationCenterExecutor | operationalActionExecutor |
| chatExecutor | operationalRealtimeCoordinator |
| | reminderSchedulerService |
| | appCommunicationService |
| | messagingAdapter |
| | admin incidents routes |

---

## I. evaluatePrepareAndExecute — únicos consumidores

- 11 `governanceAdapters/*.js`
- `aioiGovernanceIntegrationService` (callback)
- Testes audit + promotion-02 script

**Nenhum** módulo de chat, council, Pulse ou Controller invoca o pipeline hoje.
