# ECO-08 — Consumer Matrix

**Data:** 2026-07-03

---

## Matriz de consumidores convergidos

| Consumidor | Fase | Adapter | Integração | Modo actual | KPIs / Dados EG |
|------------|------|---------|------------|-------------|-----------------|
| operationalActionExecutor | ECO-03 | chatOperationalGovernanceAdapter | sendOperationalNotification | Shadow | Notificações governadas |
| operationalRealtimeCoordinator | ECO-03 | chatOperationalGovernanceAdapter | notifyUsers | Shadow | Chat operacional |
| organizationalAI | ECO-03 | chatOperationalGovernanceAdapter | notifyRecipients | Shadow | Escalation org |
| NC Bridge | ECO-03 | ncBridgeMirrorGovernanceAdapter | mirror events | Shadow | NC_BRIDGE_MIRROR |
| cognitiveControllerService | ECO-04 | cognitiveControllerConsumerAdapter | processControllerRequest | Shadow | Decisão EG + layers |
| pulseCognitiveService | ECO-05 | pulseGovernanceConsumerAdapter | getExecutiveDashboard | Shadow | Analytics EG |
| conversationContextEngine | ECO-06 | conversationKnowledgeConsumerAdapter | resolveConversationContext | Shadow | KB refs certificadas |
| pulseCognitiveService | ECO-07 | executiveInsightsConsumerAdapter | getExecutiveDashboard | Shadow | KPIs executivos |
| executiveCockpitConsolidation | ECO-07 | executiveInsightsConsumerAdapter | applyExecutiveBoardroomConsolidation | Shadow | KPIs executivos |

---

## Consumidores legados / locais (fora scope consumer EG)

| Consumidor | Classificação | Motivo |
|------------|---------------|--------|
| cognitivePulseService | **Local** | Métricas operacionais vivo (não KPIs EG) |
| AIOI Executive Cockpit | **Legado** | Domínio AIOI read-model próprio |
| Enterprise Pilot Rollout | **Legado** | Piloto rollout, não EG |
| Event Backbone bridge | **Parcial** | NC-INT-002 — bridge publisher |
| Frontend dashboardContextAdapter | **Pendente UI** | Backend audit disponível |

---

## Verificação convergência

| Critério | Estado |
|----------|--------|
| Adapter dedicado por consumidor ECO | ✅ |
| Feature flag independente | ✅ |
| Shadow mode disponível | ✅ |
| Consumer mode disponível | ✅ |
| Rollback independente | ✅ |
| Observabilidade dedicada | ✅ |
| Núcleo EG intocado | ✅ |

---

## Flag → Consumer map

```text
ECO_OAE_VIA_EG      → operationalActionExecutor
ECO_CHAT_VIA_EG     → operationalRealtimeCoordinator
ECO_ORG_AI_VIA_EG   → organizationalAI
ECO_CONTROLLER_VIA_EG → cognitiveControllerService
ECO_PULSE_VIA_EG    → pulseCognitiveService (analytics)
ECO_CONTEXT_VIA_EG  → conversationContextEngine
ECO_EXECUTIVE_VIA_EG → pulse executive + boardroom Z.27
```
